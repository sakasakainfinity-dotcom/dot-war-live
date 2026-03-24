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
    <main className="relative h-screen w-screen overflow-hidden bg-[radial-gradient(circle_at_center,_#0f172a_15%,_#020617_80%)] text-white">
      <div className="mx-auto flex h-full max-w-[1920px] flex-col px-3 pb-5 pt-3 md:px-6 md:pt-4">
        <MatchTitle title={data.title} />

        <CountdownTimer
          initialSeconds={data.timerSeconds}
          intervalSeconds={data.updateIntervalSeconds}
          onUpdateTick={handleUpdateTick}
        />

        <section className="relative mt-3 flex min-h-0 flex-1 items-center gap-3 md:mt-5 md:gap-6">
          <TeamTank team="blue" value={data.blueTank} />
          <BattleGrid grid={grid} />
          <TeamTank team="red" value={data.redTank} />

          <div className="absolute bottom-4 right-2 w-52 md:right-6 md:w-64">
            <TopRankingPanel ranking={data.ranking} />
          </div>
        </section>

        <p className="pointer-events-none absolute bottom-3 left-3 text-[10px] text-slate-400 md:text-xs">
          コメントで参加 / コメントはYouTubeアプリから
        </p>

        <SuperChatBanner chat={data.superChat} />
      </div>
    </main>
  );
}
