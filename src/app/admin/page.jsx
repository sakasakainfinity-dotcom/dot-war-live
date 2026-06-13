'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createDefaultLiveSettings, normalizeLiveSettings, normalizeModeProfile, readLiveSettings, writeLiveSettings } from '../../lib/liveSettings';
import { createMatchId, sanitizeMatchId } from '../../lib/matchId';
import { buildMatchBroadcastUrl } from '../../lib/matchUrlSettings';

const MODE_OPTIONS = [
  { value: 'soccer', label: 'サッカーモード' },
  { value: 'war', label: '2択戦争モード' },
  { value: 'consultation', label: '2択相談モード' },
];


function formatLiveChatError(payload, fallbackMessage) {
  if (!payload || typeof payload !== 'object') {
    return `保存処理に失敗しました\nmessage: ${fallbackMessage}`;
  }

  return [
    '保存処理に失敗しました',
    payload.step ? `step: ${payload.step}` : null,
    payload.status ? `status: ${payload.status}` : null,
    payload.youtubeStatus ? `youtubeStatus: ${payload.youtubeStatus}` : null,
    payload.saveStatus ? `saveStatus: ${payload.saveStatus}` : null,
    payload.message ? `message: ${payload.message}` : null,
    payload.detail ? `detail: ${payload.detail}` : null,
  ].filter(Boolean).join('\n');
}

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
  const [manualLiveChatId, setManualLiveChatId] = useState('');
  const [streamInfo, setStreamInfo] = useState({ current_video_id: '', current_live_chat_id: '', updated_at: null });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSavingLiveChat, setIsSavingLiveChat] = useState(false);
  const [footballSearchSeason, setFootballSearchSeason] = useState('2026');
  const [footballMatchOptions, setFootballMatchOptions] = useState([]);
  const [isSearchingFootballMatches, setIsSearchingFootballMatches] = useState(false);
  const [footballMatchSearchMessage, setFootballMatchSearchMessage] = useState('');
  const [footballMatchSearchError, setFootballMatchSearchError] = useState('');
  const [matchOptions, setMatchOptions] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchStatusMessage, setMatchStatusMessage] = useState('');
  const [matchErrorMessage, setMatchErrorMessage] = useState('');
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    const storedSettings = readLiveSettings();
    const safeMatchId = sanitizeMatchId(storedSettings.matchId) || createMatchId();
    const settingsWithMatchId = normalizeLiveSettings({ ...storedSettings, matchId: safeMatchId });
    setForm(settingsWithMatchId);
    setSelectedMatchId(safeMatchId);
    setOrigin(window.location.origin);
    loadCurrentStreamInfo();
    loadMatchOptions();
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

  const loadMatchOptions = async () => {
    setMatchErrorMessage('');
    const res = await fetch('/api/admin/matches', { cache: 'no-store' }).catch(() => null);
    if (!res) {
      setMatchErrorMessage('試合一覧を取得できませんでした');
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setMatchErrorMessage(data.error || '試合一覧を取得できませんでした');
      return;
    }
    setMatchOptions(Array.isArray(data.matches) ? data.matches : []);
  };

  const loadMatchSettings = async (matchId) => {
    const safeMatchId = sanitizeMatchId(matchId);
    if (!safeMatchId) return;

    setIsLoadingMatch(true);
    setMatchStatusMessage('');
    setMatchErrorMessage('');

    try {
      const res = await fetch(`/api/matches/${encodeURIComponent(safeMatchId)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.match?.settings) {
        setMatchErrorMessage(data.error || '試合設定を読み込めませんでした');
        return;
      }

      const normalized = normalizeLiveSettings({ ...data.match.settings, matchId: data.match.matchId || safeMatchId });
      writeLiveSettings(normalized);
      setForm(normalized);
      setSelectedMatchId(normalized.matchId);
      setMatchStatusMessage(`読み込みました: matchId=${normalized.matchId}`);
    } catch (error) {
      setMatchErrorMessage(`試合設定を読み込めませんでした: ${error.message}`);
    } finally {
      setIsLoadingMatch(false);
    }
  };

  const createNewMatch = () => {
    const matchId = createMatchId();
    const currentProfile = normalizeModeProfile(form, form.mode, form.startAt);
    const normalized = normalizeLiveSettings({ ...form, ...currentProfile, matchId, modeProfiles: { ...form.modeProfiles, [form.mode]: currentProfile } });
    setForm(normalized);
    setSelectedMatchId(matchId);
    setSavedAt('');
    setMatchStatusMessage(`新規試合IDを作成しました。保存すると配信URLが有効になります: matchId=${matchId}`);
    setMatchErrorMessage('');
  };

  const broadcastUrlSettings = normalizeLiveSettings({ ...form, matchId: sanitizeMatchId(form.matchId || selectedMatchId) });
  const broadcastUrl = buildMatchBroadcastUrl(origin, broadcastUrlSettings);

  const patchForm = (patch) => setForm((prev) => {
    const next = { ...prev, ...patch };
    if (Object.prototype.hasOwnProperty.call(patch, 'matchId')) {
      setSelectedMatchId(sanitizeMatchId(patch.matchId));
    }
    return next;
  });

  const setMode = (mode) => {
    setForm((prev) => {
      const currentProfile = normalizeModeProfile(prev, prev.mode, prev.startAt);
      const modeProfiles = { ...prev.modeProfiles, [prev.mode]: currentProfile };
      const nextProfile = normalizeModeProfile(modeProfiles[mode], mode, prev.startAt);
      return normalizeLiveSettings({ ...prev, ...nextProfile, matchId: prev.matchId, mode, modeProfiles: { ...modeProfiles, [mode]: nextProfile } });
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

  const handleSave = async () => {
    const matchId = sanitizeMatchId(form.matchId || selectedMatchId) || createMatchId();
    const currentProfile = normalizeModeProfile({ ...form, matchId }, form.mode, form.startAt);
    const normalized = normalizeLiveSettings({ ...form, ...currentProfile, matchId, modeProfiles: { ...form.modeProfiles, [form.mode]: currentProfile } });
    writeLiveSettings(normalized);
    setForm(normalized);
    setSelectedMatchId(matchId);
    setSavedAt(new Date().toLocaleString('ja-JP', { hour12: false }));
    setIsSavingMatch(true);
    setMatchStatusMessage('');
    setMatchErrorMessage('');

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, settings: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setMatchErrorMessage(data.error || '試合設定の保存に失敗しました');
        return;
      }
      setMatchStatusMessage(`試合設定を保存しました: matchId=${data.match.matchId}`);
      await loadMatchOptions();
    } catch (error) {
      setMatchErrorMessage(`試合設定の保存に失敗しました: ${error.message}`);
    } finally {
      setIsSavingMatch(false);
    }
  };

  const handleSaveLiveChatId = async () => {
    setIsSavingLiveChat(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/admin/youtube/set-live-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIdOrUrl, liveChatId: manualLiveChatId }),
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.ok) {
        throw new Error(formatLiveChatError(data, `保存API失敗 status=${res.status} body=${text}`));
      }

      setStatusMessage(`${data.reused ? '既存の設定を再利用しました' : data.manual ? '手入力のliveChatIdを保存しました' : '保存しました'}: videoId=${data.videoId} / liveChatId=${data.liveChatId}${data.warning ? `（警告: ${data.warning}）` : ''}`);
      setVideoIdOrUrl('');
      setManualLiveChatId('');
      await loadCurrentStreamInfo();
    } catch (error) {
      setErrorMessage(error.message || '保存処理に失敗しました');
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
      const res = await fetch(`/api/football-matches?season=${encodeURIComponent(footballSearchSeason)}`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setFootballMatchSearchError(data.error || 'W杯試合一覧の取得に失敗しました');
        return;
      }

      const matches = Array.isArray(data.matches) ? data.matches : [];
      setFootballMatchOptions(matches);
      setFootballMatchSearchMessage(matches.length > 0 ? `${data.season || '最新'}年シーズンのW杯試合候補を${matches.length}件取得しました` : `${data.season || '最新'}年シーズンのW杯試合候補は見つかりませんでした`);
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
    setFootballMatchSearchMessage(`選択しました: ${homeTeam} vs ${awayTeam} / matchId=${match.id}`);
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
              <TextField label="W杯シーズン" type="number" value={footballSearchSeason} onChange={setFootballSearchSeason} placeholder="例: 2026 / 2022" />
              <div className="admin-field admin-field-action">
                <span>FIFA World Cup（WC）</span>
                <button type="button" onClick={handleSearchFootballMatches} disabled={isSearchingFootballMatches}>{isSearchingFootballMatches ? '取得中...' : 'W杯全試合を取得'}</button>
              </div>
            </div>
            <p className="admin-help">football-data.org の <code>/v4/competitions/WC/matches?season=YYYY</code> からW杯全試合を取得します。例: 2026年大会は season=2026、2022年カタール大会は season=2022。</p>
            {footballMatchSearchMessage ? <p className="admin-success">{footballMatchSearchMessage}</p> : null}
            {footballMatchSearchError ? <p className="admin-error">{footballMatchSearchError}</p> : null}
            {footballMatchOptions.length > 0 ? (
              <div className="football-match-options">
                {footballMatchOptions.map((match) => (
                  <button key={match.id} type="button" className="football-match-option" onClick={() => selectFootballMatch(match)}>
                    <strong>{match.homeTeam || 'Home'} vs {match.awayTeam || 'Away'}</strong>
                    <span>{match.competition || '大会名なし'} · {match.utcDate ? new Date(match.utcDate).toLocaleString('ja-JP', { hour12: false }) : '日時未定'} · {match.status || 'statusなし'} · {match.stage || 'stageなし'}{match.group ? ` · ${match.group}` : ''} · ID: {match.id}</span>
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
          <TextField label="liveChatId（任意・入力時はYouTube APIを呼ばず保存）" value={manualLiveChatId} onChange={setManualLiveChatId} placeholder="例: Cg0KC05DQk5LSy1HWmM..." />
          <div className="admin-actions">
            <button type="button" onClick={handleSaveLiveChatId} disabled={isSavingLiveChat}>{isSavingLiveChat ? '保存中...' : manualLiveChatId.trim() ? 'videoId/liveChatIdを保存' : 'liveChatIdを1回だけ取得して保存'}</button>
          </div>
          {statusMessage ? <p className="admin-success">{statusMessage}</p> : null}
          {errorMessage ? <p className="admin-error">{errorMessage}</p> : null}
        </section>

        <section className="admin-section">
          <h2>試合固有URL（OBS配信用）</h2>
          <div className="admin-grid-2">
            <TextField label="試合ID / matchId" value={form.matchId || selectedMatchId} onChange={(v) => patchForm({ matchId: sanitizeMatchId(v) })} placeholder="例: match-12345" />
            <label className="admin-field">
              <span>保存済み試合を選択</span>
              <select value={selectedMatchId} onChange={(e) => loadMatchSettings(e.target.value)} disabled={isLoadingMatch}>
                <option value={form.matchId || selectedMatchId}>{matchOptions.length > 0 ? '保存済み試合を選択...' : '保存済み試合なし'}</option>
                {matchOptions.map((match) => (
                  <option key={match.matchId} value={match.matchId}>{`${match.title} / ${match.matchId}`}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-broadcast-url">
            <span>配信表示用URL</span>
            <code>{broadcastUrl || 'URL生成中...'}</code>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={createNewMatch}>新規試合作成</button>
            <button type="button" onClick={loadMatchOptions}>試合一覧を再取得</button>
          </div>
          <p className="admin-help">このURLをOBSのブラウザソースに貼り付けると、ローカルストレージに依存せずURL内のチーム名で初期表示します。保存済み試合がある場合は、OBS側が5秒ごとに同じmatchIdの最新設定を再取得します。</p>
          {matchStatusMessage ? <p className="admin-success">{matchStatusMessage}</p> : null}
          {matchErrorMessage ? <p className="admin-error">{matchErrorMessage}</p> : null}
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
          <button type="button" onClick={handleSave} disabled={isSavingMatch}>{isSavingMatch ? 'Saving...' : 'Save'}</button>
          {savedAt ? <p>{`Saved: ${savedAt}`}</p> : null}
          <Link href="/" className="stealth-link">game</Link>
        </div>
      </section>
    </main>
  );
}
