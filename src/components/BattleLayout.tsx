'use client';

import { useState } from 'react';
import { battleMockData, type BattleMockData } from '../lib/mockData';
import { BattleGrid } from './BattleGrid';
import { CountdownTimer } from './CountdownTimer';
import { MatchTitle } from './MatchTitle';
import { SuperChatBanner } from './SuperChatBanner';
import { TeamTank } from './TeamTank';
import { TopRankingPanel } from './TopRankingPanel';

interface BattleLayoutProps {
  data?: BattleMockData;
}

export function BattleLayout({ data = battleMockData }: BattleLayoutProps) {
  const [grid, setGrid] = useState(data.grid);

  const handleUpdateTick = () => {
    setGrid((prev) =>
      prev.map((row) =>
        row.map((cell) => {
          if (Math.random() < 0.03) return cell === 'blue' ? 'red' : 'blue';
          return cell;
        }),
      ),
    );
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#1e293b_0%,#020617_58%,#02030a_100%)] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_right,rgba(248,113,113,0.16),transparent_35%)]" />

      <div className="mx-auto flex h-full max-w-[1920px] flex-col px-3 pb-3 pt-3 md:px-6 md:pt-4">
        <section className="grid grid-cols-1 items-start gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
          <div className="hidden md:block" />
          <MatchTitle title={data.title} />
          <div className="mx-auto md:mx-0 md:justify-self-end">
            <CountdownTimer
              initialSeconds={data.timerSeconds}
              intervalSeconds={data.updateIntervalSeconds}
              onUpdateTick={handleUpdateTick}
            />
          </div>
        </section>

        <section className="relative mt-3 grid min-h-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-3 md:mt-4 md:gap-5">
          <TeamTank team="blue" value={data.blueTank} />
          <BattleGrid grid={grid} />
          <TeamTank team="red" value={data.redTank} />

          <div className="absolute bottom-4 right-1 z-20 w-52 md:bottom-5 md:right-3 md:w-64">
            <TopRankingPanel ranking={data.ranking} />
          </div>
        </section>

        <div className="pointer-events-none absolute bottom-[86px] left-1/2 z-10 -translate-x-1/2 rounded-xl border border-white/20 bg-slate-950/75 px-5 py-2 text-sm font-bold tracking-[0.06em] text-slate-100 shadow-[0_0_15px_rgba(15,23,42,0.6)]">
          コメントで参加 / コメントはYouTubeアプリから
        </div>

        <SuperChatBanner chat={data.superChat} />
      </div>
    </main>
  );
}
