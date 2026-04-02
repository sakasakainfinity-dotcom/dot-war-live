'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createDefaultLiveSettings, normalizeLiveSettings, readLiveSettings, writeLiveSettings } from '../../lib/liveSettings';

function toLocalInputValue(iso) {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalInputValue(value, fallbackIso) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallbackIso : parsed.toISOString();
}

function BoolField({ label, value, onChange }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

const FIXED_PERIOD_LABELS = ['NORMAL', 'DOUBLE VOTE', 'CENTRAL BONUS', 'NORMAL', 'AI RANDOM', 'RANDOM BOMB'];

export default function AdminPage() {
  const defaults = useMemo(() => createDefaultLiveSettings(), []);
  const [form, setForm] = useState(defaults);
  const [savedAt, setSavedAt] = useState('');
  const [videoIdOrUrl, setVideoIdOrUrl] = useState('');
  const [streamInfo, setStreamInfo] = useState({ current_video_id: '', current_live_chat_id: '', updated_at: null });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingLiveChat, setIsSavingLiveChat] = useState(false);

  useEffect(() => {
    setForm(readLiveSettings());
    loadCurrentStreamInfo();
  }, []);

  const loadCurrentStreamInfo = async () => {
    setErrorMessage('');
    const res = await fetch('/api/admin/youtube/current', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErrorMessage(data.error || '現在の配信設定を取得できませんでした');
      return;
    }
    setStreamInfo(data.current);
  };

  const updatePeriodDefinition = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      periodDefinitions: prev.periodDefinitions.map((period, periodIndex) => (periodIndex === index ? { ...period, [key]: value } : period)),
    }));
  };

  const updateReplyConfig = (key, value) => setForm((prev) => ({ ...prev, replyConfig: { ...prev.replyConfig, [key]: value } }));
  const updateVoiceConfig = (key, value) => setForm((prev) => ({ ...prev, voiceConfig: { ...prev.voiceConfig, [key]: value } }));

  const handleSave = () => {
    const normalized = normalizeLiveSettings(form);
    writeLiveSettings(normalized);
    setForm(normalized);
    setSavedAt(new Date().toLocaleString('ja-JP', { hour12: false }));
  };

  const handleSaveLiveChatId = async () => {
    setIsSavingLiveChat(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/youtube/set-live-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIdOrUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || 'liveChatIdの保存に失敗しました');
        return;
      }

      setStatusMessage(`保存しました: videoId=${data.videoId} / liveChatId=${data.liveChatId}`);
      setVideoIdOrUrl('');
      await loadCurrentStreamInfo();
    } catch (error) {
      setErrorMessage(`liveChatIdの保存に失敗しました: ${error.message}`);
    } finally {
      setIsSavingLiveChat(false);
    }
  };

  return (
    <main className="admin-root">
      <section className="admin-card admin-card-wide">
        <h1>Dot War Live Admin (48 Period Fixed Loop)</h1>
        <p className="admin-help">配信全体設定・6種のperiod定義・AI返信設定を保存すると即時に本番UIへ反映されます。</p>

        <section className="admin-section">
          <h2>YouTubeライブ連携</h2>
          <div className="admin-grid-2">
            <p><strong>現在の動画ID:</strong> {streamInfo.current_video_id || '未設定'}</p>
            <p><strong>現在のliveChatId:</strong> {streamInfo.current_live_chat_id || '未設定'}</p>
            <p><strong>最終更新:</strong> {streamInfo.updated_at ? new Date(streamInfo.updated_at).toLocaleString('ja-JP', { hour12: false }) : '未更新'}</p>
          </div>
          <label className="admin-field">
            <span>動画IDまたはYouTubeライブURL</span>
            <input
              value={videoIdOrUrl}
              onChange={(e) => setVideoIdOrUrl(e.target.value)}
              placeholder="例: NCBNKK-kGZc / https://youtube.com/live/NCBNKK-kGZc"
            />
          </label>
          <div className="admin-actions">
            <button type="button" onClick={handleSaveLiveChatId} disabled={isSavingLiveChat}>
              {isSavingLiveChat ? '取得中...' : 'liveChatIdを取得して保存'}
            </button>
          </div>
          {statusMessage ? <p className="admin-success">{statusMessage}</p> : null}
          {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
        </section>

        <div className="admin-grid-2">
          <label className="admin-field">
            <span>配信日</span>
            <input value={form.streamDate} onChange={(e) => setForm((prev) => ({ ...prev, streamDate: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>配信開始日時</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(form.startAt)}
              onChange={(e) => setForm((prev) => ({ ...prev, startAt: fromLocalInputValue(e.target.value, prev.startAt) }))}
            />
          </label>
        </div>

        <div className="admin-grid-2">
          <label className="admin-field">
            <span>配信終了日時</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(form.endAt)}
              onChange={(e) => setForm((prev) => ({ ...prev, endAt: fromLocalInputValue(e.target.value, prev.endAt) }))}
            />
          </label>
        </div>

        <section className="admin-section">
          <h2>対戦タイトル入力（VSは自動）</h2>
          <div className="admin-grid-2">
            <label className="admin-field">
              <span>teamA_en</span>
              <input value={form.teamA_en} onChange={(e) => setForm((prev) => ({ ...prev, teamA_en: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>teamB_en</span>
              <input value={form.teamB_en} onChange={(e) => setForm((prev) => ({ ...prev, teamB_en: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>teamA_ja</span>
              <input value={form.teamA_ja} onChange={(e) => setForm((prev) => ({ ...prev, teamA_ja: e.target.value }))} />
            </label>
            <label className="admin-field">
              <span>teamB_ja</span>
              <input value={form.teamB_ja} onChange={(e) => setForm((prev) => ({ ...prev, teamB_ja: e.target.value }))} />
            </label>
          </div>
        </section>

        <div className="admin-toggle-grid">
          <BoolField label="自動実況ON" value={form.autoNarrationEnabled} onChange={(v) => setForm((p) => ({ ...p, autoNarrationEnabled: v }))} />
          <BoolField label="AI返信ON" value={form.aiReplyEnabled} onChange={(v) => setForm((p) => ({ ...p, aiReplyEnabled: v }))} />
          <BoolField label="音声返信ON" value={form.voiceReplyEnabled} onChange={(v) => setForm((p) => ({ ...p, voiceReplyEnabled: v }))} />
          <BoolField label="X自動投稿ON" value={form.autoPostXEnabled} onChange={(v) => setForm((p) => ({ ...p, autoPostXEnabled: v }))} />
          <BoolField label="Threads自動投稿ON" value={form.autoPostThreadsEnabled} onChange={(v) => setForm((p) => ({ ...p, autoPostThreadsEnabled: v }))} />
        </div>

        <section className="admin-section">
          <h2>コメント返信設定</h2>
          <div className="admin-grid-3">
            <label className="admin-field">
              <span>返信モード</span>
              <select value={form.replyConfig.mode} onChange={(e) => updateReplyConfig('mode', e.target.value)}>
                <option value="broad">broad</option>
                <option value="normal">normal</option>
                <option value="strict">strict</option>
              </select>
            </label>
            <label className="admin-field"><span>返信頻度/分</span><input type="number" value={form.replyConfig.frequencyLimitPerMinute} onChange={(e) => updateReplyConfig('frequencyLimitPerMinute', e.target.value)} /></label>
            <label className="admin-field"><span>同一ユーザー待機(ms)</span><input type="number" value={form.replyConfig.sameUserCooldownMs} onChange={(e) => updateReplyConfig('sameUserCooldownMs', e.target.value)} /></label>
            <label className="admin-field"><span>最小文字数</span><input type="number" value={form.replyConfig.minLength} onChange={(e) => updateReplyConfig('minLength', e.target.value)} /></label>
            <label className="admin-field"><span>最大文字数</span><input type="number" value={form.replyConfig.maxLength} onChange={(e) => updateReplyConfig('maxLength', e.target.value)} /></label>
            <label className="admin-field"><span>スパチャ優先度</span><input type="number" value={form.replyConfig.paidPriority} onChange={(e) => updateReplyConfig('paidPriority', e.target.value)} /></label>
            <label className="admin-field"><span>戦況優先度</span><input type="number" value={form.replyConfig.strategyPriority} onChange={(e) => updateReplyConfig('strategyPriority', e.target.value)} /></label>
            <label className="admin-field"><span>反応優先度</span><input type="number" value={form.replyConfig.battlePriority} onChange={(e) => updateReplyConfig('battlePriority', e.target.value)} /></label>
            <label className="admin-field"><span>面白優先度</span><input type="number" value={form.replyConfig.funnyPriority} onChange={(e) => updateReplyConfig('funnyPriority', e.target.value)} /></label>
          </div>
        </section>

        <section className="admin-section">
          <h2>音声設定</h2>
          <div className="admin-grid-3">
            <BoolField label="音声ON" value={form.voiceConfig.enabled} onChange={(v) => updateVoiceConfig('enabled', v)} />
            <label className="admin-field"><span>話速</span><input type="number" step="0.01" value={form.voiceConfig.speed} onChange={(e) => updateVoiceConfig('speed', e.target.value)} /></label>
            <label className="admin-field"><span>音量</span><input type="number" step="0.01" value={form.voiceConfig.volume} onChange={(e) => updateVoiceConfig('volume', e.target.value)} /></label>
            <label className="admin-field"><span>最大秒数</span><input type="number" value={form.voiceConfig.maxSeconds} onChange={(e) => updateVoiceConfig('maxSeconds', e.target.value)} /></label>
            <BoolField label="長文要約ON" value={form.voiceConfig.summarizeLongText} onChange={(v) => updateVoiceConfig('summarizeLongText', v)} />
          </div>
        </section>

        <section className="admin-section">
          <h2>固定period定義（6種類のみ編集）</h2>
          <p className="admin-help">順番固定: NORMAL → DOUBLE VOTE → CENTRAL BONUS → NORMAL → AI RANDOM → RANDOM BOMB（これを8周 = 計48period）</p>
          <div className="period-list">
            {form.periodDefinitions.map((period, index) => (
              <div key={period.id} className="period-card">
                <h3>{`${index + 1}. ${FIXED_PERIOD_LABELS[index]}`}</h3>
                <div className="admin-grid-3">
                  <label className="admin-field"><span>period key</span><input value={period.periodKey} disabled /></label>
                  <label className="admin-field"><span>period title (EN)</span><input value={period.title} onChange={(e) => updatePeriodDefinition(index, 'title', e.target.value)} /></label>
                  <BoolField label="enabled" value={period.enabled} onChange={(v) => updatePeriodDefinition(index, 'enabled', v)} />
                </div>
                <label className="admin-field"><span>short description en</span><input value={period.descriptionEn} onChange={(e) => updatePeriodDefinition(index, 'descriptionEn', e.target.value)} /></label>
                <label className="admin-field"><span>short description ja</span><input value={period.descriptionJa} onChange={(e) => updatePeriodDefinition(index, 'descriptionJa', e.target.value)} /></label>
              </div>
            ))}
          </div>
        </section>

        <div className="admin-actions">
          <button type="button" onClick={handleSave}>Save</button>
          {savedAt ? <p>{`Saved: ${savedAt}`}</p> : null}
          <Link href="/" className="stealth-link">game</Link>
        </div>
      </section>
    </main>
  );
}
