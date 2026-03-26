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

export default function AdminPage() {
  const defaults = useMemo(() => createDefaultLiveSettings(), []);
  const [form, setForm] = useState(defaults);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    setForm(readLiveSettings());
  }, []);

  const updatePeriod = (id, key, value) => {
    setForm((prev) => ({
      ...prev,
      periods: prev.periods.map((period) => (period.id === id ? { ...period, [key]: value } : period)),
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

  return (
    <main className="admin-root">
      <section className="admin-card admin-card-wide">
        <h1>Dot War Live Admin (24H)</h1>
        <p className="admin-help">配信全体設定・ピリオド設定・AI返信設定を保存すると即時に本番UIへ反映されます。</p>

        <div className="admin-grid-2">
          <label className="admin-field">
            <span>配信日</span>
            <input value={form.streamDate} onChange={(e) => setForm((prev) => ({ ...prev, streamDate: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>配信タイトル</span>
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </label>
        </div>

        <label className="admin-field">
          <span>メインテーマ</span>
          <input value={form.theme} onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))} />
        </label>

        <div className="admin-grid-2">
          <label className="admin-field">
            <span>配信開始日時</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(form.startAt)}
              onChange={(e) => setForm((prev) => ({ ...prev, startAt: fromLocalInputValue(e.target.value, prev.startAt) }))}
            />
          </label>
          <label className="admin-field">
            <span>配信終了日時</span>
            <input
              type="datetime-local"
              value={toLocalInputValue(form.endAt)}
              onChange={(e) => setForm((prev) => ({ ...prev, endAt: fromLocalInputValue(e.target.value, prev.endAt) }))}
            />
          </label>
        </div>

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
          <h2>ピリオド設定</h2>
          <div className="period-list">
            {form.periods.map((period) => (
              <div key={period.id} className="period-card">
                <div className="admin-grid-3">
                  <label className="admin-field"><span>表示順</span><input type="number" value={period.sortOrder} onChange={(e) => updatePeriod(period.id, 'sortOrder', e.target.value)} /></label>
                  <label className="admin-field"><span>ピリオド名</span><input value={period.name} onChange={(e) => updatePeriod(period.id, 'name', e.target.value)} /></label>
                  <label className="admin-field"><span>ボーナスタイプ</span><input value={period.bonusType} onChange={(e) => updatePeriod(period.id, 'bonusType', e.target.value)} /></label>
                  <label className="admin-field"><span>開始時刻</span><input type="datetime-local" value={toLocalInputValue(period.startAt)} onChange={(e) => updatePeriod(period.id, 'startAt', fromLocalInputValue(e.target.value, period.startAt))} /></label>
                  <label className="admin-field"><span>終了時刻</span><input type="datetime-local" value={toLocalInputValue(period.endAt)} onChange={(e) => updatePeriod(period.id, 'endAt', fromLocalInputValue(e.target.value, period.endAt))} /></label>
                  <label className="admin-field"><span>倍率</span><input type="number" step="0.1" value={period.bonusValue} onChange={(e) => updatePeriod(period.id, 'bonusValue', e.target.value)} /></label>
                  <label className="admin-field"><span>AI実況レベル</span><input type="number" min="0" max="5" value={period.narrationLevel} onChange={(e) => updatePeriod(period.id, 'narrationLevel', e.target.value)} /></label>
                  <label className="admin-field">
                    <span>返信モード</span>
                    <select value={period.aiCommentMode} onChange={(e) => updatePeriod(period.id, 'aiCommentMode', e.target.value)}>
                      <option value="broad">broad</option>
                      <option value="normal">normal</option>
                      <option value="strict">strict</option>
                    </select>
                  </label>
                  <BoolField label="音声返信ON" value={period.voiceReplyEnabled} onChange={(v) => updatePeriod(period.id, 'voiceReplyEnabled', v)} />
                </div>
                <label className="admin-field"><span>ピリオド説明</span><input value={period.description} onChange={(e) => updatePeriod(period.id, 'description', e.target.value)} /></label>
                <label className="admin-field"><span>特別表示文言</span><input value={period.overlayText} onChange={(e) => updatePeriod(period.id, 'overlayText', e.target.value)} /></label>
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
