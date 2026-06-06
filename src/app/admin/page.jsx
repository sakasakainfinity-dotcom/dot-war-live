'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createDefaultLiveSettings, normalizeLiveSettings, normalizeModeProfile, readLiveSettings, writeLiveSettings } from '../../lib/liveSettings';

const MODE_OPTIONS = [
  { value: 'soccer', label: 'サッカーモード' },
  { value: 'war', label: '2択戦争モード' },
  { value: 'consultation', label: '2択相談モード' },
];

function toLocalInputValue(iso) {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function toDateInputValue(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fromLocalInputValue(value, fallbackIso) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallbackIso : parsed.toISOString();
}

function addMinutes(iso, minutes) {
  const baseMs = new Date(iso).getTime();
  const safeBaseMs = Number.isFinite(baseMs) ? baseMs : Date.now();
  return new Date(safeBaseMs + Number(minutes || 0) * 60 * 1000).toISOString();
}

function BoolField({ label, value, onChange }) {
  return (
    <label className="admin-toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function TextField({ label, value, onChange, type = 'text', ...props }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...props} />
    </label>
  );
}

export default function AdminPage() {
  const defaults = useMemo(() => createDefaultLiveSettings(), []);
  const [form, setForm] = useState(defaults);
  const [savedAt, setSavedAt] = useState('');
  const [videoIdOrUrl, setVideoIdOrUrl] = useState('');
  const [streamInfo, setStreamInfo] = useState({ current_video_id: '', current_live_chat_id: '', updated_at: null });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingLiveChat, setIsSavingLiveChat] = useState(false);
  const [footballSearchDate, setFootballSearchDate] = useState(() => toDateInputValue(defaults.startAt));
  const [footballMatchOptions, setFootballMatchOptions] = useState([]);
  const [isSearchingFootballMatches, setIsSearchingFootballMatches] = useState(false);
  const [footballMatchSearchMessage, setFootballMatchSearchMessage] = useState('');
  const [footballMatchSearchError, setFootballMatchSearchError] = useState('');

  useEffect(() => {
    const storedSettings = readLiveSettings();
    setForm(storedSettings);
    setFootballSearchDate(toDateInputValue(storedSettings.startAt));
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

  const patchForm = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const setMode = (mode) => {
    setForm((prev) => {
      const currentProfile = normalizeModeProfile(prev, prev.mode, prev.startAt);
      const modeProfiles = { ...prev.modeProfiles, [prev.mode]: currentProfile };
      const nextProfile = normalizeModeProfile(modeProfiles[mode], mode, prev.startAt);
      return normalizeLiveSettings({ ...prev, ...nextProfile, mode, modeProfiles: { ...modeProfiles, [mode]: nextProfile } });
    });
  };

  const setStartAt = (value) => {
    setForm((prev) => {
      const startAt = fromLocalInputValue(value, prev.startAt);
      return { ...prev, startAt, endAt: addMinutes(startAt, prev.durationMinutes) };
    });
  };

  const setDuration = (minutes) => {
    setForm((prev) => ({ ...prev, durationMinutes: minutes, endAt: addMinutes(prev.startAt, minutes) }));
  };

  const setEndAt = (value) => {
    setForm((prev) => {
      const endAt = fromLocalInputValue(value, prev.endAt);
      const durationMinutes = Math.max(1, Math.round((new Date(endAt).getTime() - new Date(prev.startAt).getTime()) / 60000));
      return { ...prev, endAt, durationMinutes };
    });
  };

  const updateReplyConfig = (key, value) => setForm((prev) => ({ ...prev, replyConfig: { ...prev.replyConfig, [key]: value } }));
  const updateVoiceConfig = (key, value) => setForm((prev) => ({ ...prev, voiceConfig: { ...prev.voiceConfig, [key]: value } }));
  const updateAnnouncementConfig = (key, value) => setForm((prev) => ({ ...prev, announcementConfig: { ...prev.announcementConfig, [key]: value } }));
  const updateBgmConfig = (key, value) => setForm((prev) => ({ ...prev, bgmConfig: { ...prev.bgmConfig, [key]: value } }));

  const handleSave = () => {
    const currentProfile = normalizeModeProfile(form, form.mode, form.startAt);
    const normalized = normalizeLiveSettings({ ...form, ...currentProfile, modeProfiles: { ...form.modeProfiles, [form.mode]: currentProfile } });
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

  const handleSearchFootballMatches = async () => {
    setIsSearchingFootballMatches(true);
    setFootballMatchSearchMessage('');
    setFootballMatchSearchError('');
    setFootballMatchOptions([]);

    try {
      const res = await fetch(`/api/football-matches?date=${encodeURIComponent(footballSearchDate)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setFootballMatchSearchError(data.error || 'W杯試合一覧の取得に失敗しました');
        return;
      }

      const matches = Array.isArray(data.matches) ? data.matches : [];
      setFootballMatchOptions(matches);
      setFootballMatchSearchMessage(matches.length > 0 ? `${data.dateFrom || footballSearchDate} から ${data.dateTo || '10日後'} までのW杯試合候補を${matches.length}件取得しました${data.warning ? `（${data.warning}）` : ''}` : `${data.dateFrom || footballSearchDate} から ${data.dateTo || '10日後'} までのW杯試合候補は見つかりませんでした${data.warning ? `（${data.warning}）` : ''}`);
    } catch (error) {
      setFootballMatchSearchError(`W杯試合一覧の取得に失敗しました: ${error.message}`);
    } finally {
      setIsSearchingFootballMatches(false);
    }
  };

  const selectFootballMatch = (match) => {
    const homeTeam = match.homeTeam || form.sideAName;
    const awayTeam = match.awayTeam || form.sideBName;
    const kickoff = new Date(match.utcDate);
    const hasKickoff = !Number.isNaN(kickoff.getTime());
    const startAt = hasKickoff ? kickoff.toISOString() : form.startAt;

    patchForm({
      footballMatchId: `${match.id}`,
      title: `${homeTeam} vs ${awayTeam}`,
      sideAName: homeTeam,
      sideBName: awayTeam,
      sideALabel: homeTeam,
      sideBLabel: awayTeam,
      teamA_en: homeTeam,
      teamB_en: awayTeam,
      teamA_ja: homeTeam,
      teamB_ja: awayTeam,
      competitionName: match.competition || form.competitionName,
      startAt,
      endAt: hasKickoff ? addMinutes(startAt, form.durationMinutes) : form.endAt,
    });
    setFootballMatchSearchMessage(`選択しました: ${homeTeam} vs ${awayTeam} / matchId=${match.id}${match.source && match.source !== 'football-data.org' ? '（固定候補）' : ''}`);
  };

  const renderModeFields = () => {
    if (form.mode === 'soccer') {
      return (
        <section className="admin-section">
          <h2>サッカーモード設定</h2>
          <div className="admin-grid-3">
            <TextField label="試合タイトル" value={form.title} onChange={(v) => patchForm({ title: v })} />
            <TextField label="Aチーム名" value={form.sideAName} onChange={(v) => patchForm({ sideAName: v, teamA_en: v })} />
            <TextField label="Bチーム名" value={form.sideBName} onChange={(v) => patchForm({ sideBName: v, teamB_en: v })} />
            <TextField label="Aチーム短縮名 / 表示名" value={form.sideALabel} onChange={(v) => patchForm({ sideALabel: v, teamA_ja: v })} />
            <TextField label="Bチーム短縮名 / 表示名" value={form.sideBLabel} onChange={(v) => patchForm({ sideBLabel: v, teamB_ja: v })} />
            <TextField label="Aチーム絵文字" value={form.soccerTeamAEmoji} onChange={(v) => patchForm({ soccerTeamAEmoji: v })} />
            <TextField label="Bチーム絵文字" value={form.soccerTeamBEmoji} onChange={(v) => patchForm({ soccerTeamBEmoji: v })} />
            <TextField label="大会名・リーグ名" value={form.competitionName} onChange={(v) => patchForm({ competitionName: v })} />
            <TextField label="football-data.org matchId" value={form.footballMatchId} onChange={(v) => patchForm({ footballMatchId: v })} placeholder="候補から選ぶと自動入力されます" />
            <TextField label="試合開始日時" type="datetime-local" value={toLocalInputValue(form.startAt)} onChange={setStartAt} />
            <TextField label="前半時間（分）" type="number" value={form.soccerFirstHalfMinutes} onChange={(v) => patchForm({ soccerFirstHalfMinutes: v })} />
            <TextField label="ハーフタイム時間（分）" type="number" value={form.soccerHalfTimeMinutes} onChange={(v) => patchForm({ soccerHalfTimeMinutes: v })} />
            <TextField label="後半時間（分）" type="number" value={form.soccerSecondHalfMinutes} onChange={(v) => patchForm({ soccerSecondHalfMinutes: v })} />
          </div>
          <div className="admin-football-search">
            <h3>football-data.org W杯試合候補検索</h3>
            <div className="admin-grid-2">
              <TextField label="検索する日付" type="date" value={footballSearchDate} onChange={setFootballSearchDate} />
              <div className="admin-field admin-field-action">
                <span>FIFA World Cup（WC）</span>
                <button type="button" onClick={handleSearchFootballMatches} disabled={isSearchingFootballMatches}>{isSearchingFootballMatches ? '取得中...' : 'この日からW杯を検索'}</button>
              </div>
            </div>
            <p className="admin-help">選択した日付から10日間の FIFA World Cup（competition code: WC）だけを検索します。football-data.org で候補が見つからない場合は、2026年W杯の固定候補を表示します。</p>
            {footballMatchSearchMessage ? <p className="admin-success">{footballMatchSearchMessage}</p> : null}
            {footballMatchSearchError ? <p className="admin-error">{footballMatchSearchError}</p> : null}
            {footballMatchOptions.length > 0 ? (
              <div className="football-match-options">
                {footballMatchOptions.map((match) => (
                  <button key={match.id} type="button" className="football-match-option" onClick={() => selectFootballMatch(match)}>
                    <strong>{match.homeTeam || 'Home'} vs {match.awayTeam || 'Away'}</strong>
                    <span>{match.competition || '大会名なし'} · {match.utcDate ? new Date(match.utcDate).toLocaleString('ja-JP', { hour12: false }) : '日時未定'} · {match.status || 'statusなし'} · ID: {match.id}{match.source && match.source !== 'football-data.org' ? ' · 固定候補' : ''}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <p className="admin-help">初期値は前半50分 / ハーフタイム15分 / 後半50分です。メイン画面は48ピリオドではなく「前半・ハーフタイム・後半・FULL TIME」を表示します。</p>
        </section>
      );
    }

    if (form.mode === 'consultation') {
      return (
        <section className="admin-section">
          <h2>2択相談モード設定</h2>
          <div className="admin-grid-2">
            <TextField label="相談タイトル" value={form.title} onChange={(v) => patchForm({ title: v })} />
            <TextField label="相談本文" value={form.consultationBody} onChange={(v) => patchForm({ consultationBody: v })} />
            <TextField label="A案" value={form.sideAName} onChange={(v) => patchForm({ sideAName: v, sideALabel: v, teamA_en: v, teamA_ja: v })} />
            <TextField label="B案" value={form.sideBName} onChange={(v) => patchForm({ sideBName: v, sideBLabel: v, teamB_en: v, teamB_ja: v })} />
            <TextField label="A案説明" value={form.sideADescription} onChange={(v) => patchForm({ sideADescription: v })} />
            <TextField label="B案説明" value={form.sideBDescription} onChange={(v) => patchForm({ sideBDescription: v })} />
            <TextField label="開始日時" type="datetime-local" value={toLocalInputValue(form.startAt)} onChange={setStartAt} />
            <TextField label="終了日時" type="datetime-local" value={toLocalInputValue(form.endAt)} onChange={setEndAt} />
            <TextField label="開催時間（分）" type="number" value={form.durationMinutes} onChange={setDuration} />
          </div>
          <p className="admin-help">初期値は1時間決着です。</p>
        </section>
      );
    }

    return (
      <section className="admin-section">
        <h2>2択戦争モード設定</h2>
        <div className="admin-grid-2">
          <TextField label="対決タイトル" value={form.title} onChange={(v) => patchForm({ title: v })} />
          <TextField label="A陣営名" value={form.sideAName} onChange={(v) => patchForm({ sideAName: v, sideALabel: v, teamA_en: v, teamA_ja: v })} />
          <TextField label="B陣営名" value={form.sideBName} onChange={(v) => patchForm({ sideBName: v, sideBLabel: v, teamB_en: v, teamB_ja: v })} />
          <TextField label="A説明文" value={form.sideADescription} onChange={(v) => patchForm({ sideADescription: v })} />
          <TextField label="B説明文" value={form.sideBDescription} onChange={(v) => patchForm({ sideBDescription: v })} />
          <TextField label="開始日時" type="datetime-local" value={toLocalInputValue(form.startAt)} onChange={setStartAt} />
          <TextField label="終了日時" type="datetime-local" value={toLocalInputValue(form.endAt)} onChange={setEndAt} />
          <TextField label="開催時間（分）" type="number" value={form.durationMinutes} onChange={setDuration} />
        </div>
        <p className="admin-help">初期値は24時間決着です。</p>
      </section>
    );
  };

  return (
    <main className="admin-root">
      <section className="admin-card admin-card-wide">
        <h1>Fan War Live Admin</h1>
        <p className="admin-help">A/B投票型の配信ゲーム設定を保存すると即時に本番UIへ反映されます。</p>

        <section className="admin-section">
          <h2>YouTubeライブ連携</h2>
          <div className="admin-grid-2">
            <p><strong>現在の動画ID:</strong> {streamInfo.current_video_id || '未設定'}</p>
            <p><strong>現在のliveChatId:</strong> {streamInfo.current_live_chat_id || '未設定'}</p>
            <p><strong>最終更新:</strong> {streamInfo.updated_at ? new Date(streamInfo.updated_at).toLocaleString('ja-JP', { hour12: false }) : '未更新'}</p>
          </div>
          <TextField label="動画IDまたはYouTubeライブURL" value={videoIdOrUrl} onChange={setVideoIdOrUrl} placeholder="例: NCBNKK-kGZc / https://youtube.com/live/NCBNKK-kGZc" />
          <div className="admin-actions">
            <button type="button" onClick={handleSaveLiveChatId} disabled={isSavingLiveChat}>{isSavingLiveChat ? '取得中...' : 'liveChatIdを取得して保存'}</button>
          </div>
          {statusMessage ? <p className="admin-success">{statusMessage}</p> : null}
          {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
        </section>

        <section className="admin-section">
          <h2>モード選択</h2>
          <label className="admin-field">
            <span>配信モード</span>
            <select value={form.mode} onChange={(e) => setMode(e.target.value)}>
              {MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </section>

        {renderModeFields()}

        <section className="admin-section">
          <h2>共通ルール</h2>
          <p className="admin-help">コメント投票は全モード共通で A = 青陣営 / B = 赤陣営 です。コメントは A または B のみ有効です。</p>
        </section>

        <div className="admin-toggle-grid">
          <BoolField label="自動実況ON" value={form.autoNarrationEnabled} onChange={(v) => patchForm({ autoNarrationEnabled: v })} />
          <BoolField label="自動アナウンスON" value={form.autoAnnouncementEnabled} onChange={(v) => patchForm({ autoAnnouncementEnabled: v })} />
          <BoolField label="AI返信ON" value={form.aiReplyEnabled} onChange={(v) => patchForm({ aiReplyEnabled: v })} />
          <BoolField label="音声返信ON" value={form.voiceReplyEnabled} onChange={(v) => patchForm({ voiceReplyEnabled: v })} />
          <BoolField label="BGM ON" value={form.bgmConfig.enabled} onChange={(v) => updateBgmConfig('enabled', v)} />
          <BoolField label="BGM Mute" value={form.bgmConfig.muted} onChange={(v) => updateBgmConfig('muted', v)} />
          <BoolField label="X自動投稿ON" value={form.autoPostXEnabled} onChange={(v) => patchForm({ autoPostXEnabled: v })} />
          <BoolField label="Threads自動投稿ON" value={form.autoPostThreadsEnabled} onChange={(v) => patchForm({ autoPostThreadsEnabled: v })} />
        </div>

        <section className="admin-section">
          <h2>詳細設定</h2>
          <div className="admin-grid-3">
            <BoolField label="自動アナウンス有効" value={form.announcementConfig.enabled} onChange={(v) => updateAnnouncementConfig('enabled', v)} />
            <TextField label="アナウンス間隔(秒)" type="number" value={form.announcementConfig.intervalSec} onChange={(v) => updateAnnouncementConfig('intervalSec', v)} />
            <TextField label="アナウンス最小CD(秒)" type="number" value={form.announcementConfig.minCooldownSec} onChange={(v) => updateAnnouncementConfig('minCooldownSec', v)} />
            <TextField label="返信頻度/分" type="number" value={form.replyConfig.frequencyLimitPerMinute} onChange={(v) => updateReplyConfig('frequencyLimitPerMinute', v)} />
            <TextField label="BGM音量(0-1)" type="number" step="0.01" value={form.bgmConfig.volume} onChange={(v) => updateBgmConfig('volume', v)} />
            <TextField label="音声音量(0-1)" type="number" step="0.01" value={form.voiceConfig.volume} onChange={(v) => updateVoiceConfig('volume', v)} />
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
