import { Suspense } from 'react';
import { BattleLayout } from '../components/BattleLayout';
import { sanitizeMatchId } from '../lib/matchId';
import { createUrlMatchSettings } from '../lib/matchUrlSettings';
import { readLiveMatch } from '../lib/server/matchesStore';

async function resolveInitialMatch(searchParams) {
  const params = await searchParams;
  const matchId = sanitizeMatchId(params?.matchId || params?.roomId);
  const urlSettings = createUrlMatchSettings(params);
  if (!matchId) return { matchId: '', settings: urlSettings, loadState: { status: 'idle', message: '' } };

  try {
    const match = await readLiveMatch(matchId);
    if (!match?.settings) {
      return {
        matchId,
        settings: urlSettings,
        loadState: urlSettings
          ? { status: 'success', message: `URL内のチーム名で表示中: matchId=${matchId}` }
          : { status: 'error', message: '指定された試合が見つかりません' },
      };
    }

    return {
      matchId: match.matchId || matchId,
      settings: match.settings,
      loadState: { status: 'success', message: `matchId=${match.matchId || matchId}` },
    };
  } catch (error) {
    return {
      matchId,
      settings: urlSettings,
      loadState: urlSettings
        ? { status: 'success', message: `URL内のチーム名で表示中: matchId=${matchId}` }
        : { status: 'error', message: error.message || '試合設定を取得できませんでした' },
    };
  }
}

export default async function Page({ searchParams }) {
  const initialMatch = await resolveInitialMatch(searchParams);

  return (
    <Suspense fallback={null}>
      <BattleLayout
        initialMatchId={initialMatch.matchId}
        initialMatchSettings={initialMatch.settings}
        initialMatchLoadState={initialMatch.loadState}
      />
    </Suspense>
  );
}
