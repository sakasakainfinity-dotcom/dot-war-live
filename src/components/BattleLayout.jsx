'use client';

import { useState } from 'react';
import { battleMockData } from '../lib/mockData';
import { BattleGrid } from './BattleGrid';
import { CommandGuideDock } from './CommandGuideDock';
import { CountdownTimer } from './CountdownTimer';
import { MatchTitle } from './MatchTitle';
import { SuperChatBanner } from './SuperChatBanner';
import { TeamTank } from './TeamTank';
import { TopRankingPanel } from './TopRankingPanel';

export function BattleLayout({ data = battleMockData }) {
  const [grid, setGrid] = useState(data.grid);

  const handleUpdateTick = () => {
    setGrid((prev) =>
      prev.map((row) =>
        row.map((cell) => {
          if (Math.random() < 0.03) {
            return cell === 'blue' ? 'red' : 'blue';
          }
          return cell;
        }),
      ),
    );
  };

  return (
    <main className="hud-root">
      <div className="hud-stage">
        <section className="hud-topbar">
          <MatchTitle title={data.title} />
          <CountdownTimer
            initialSeconds={data.timerSeconds}
            intervalSeconds={data.updateIntervalSeconds}
            onUpdateTick={handleUpdateTick}
          />
        </section>
        <SuperChatBanner chat={data.superChat} />

        <section className="hud-center">
          <TeamTank team="blue" value={data.blueTank} />
          <div className="hud-grid-wrap">
            <BattleGrid grid={grid} />
          </div>
          <TeamTank team="red" value={data.redTank} />
          <div className="hud-ranking-wrap">
            <TopRankingPanel ranking={data.ranking} />
          </div>
        </section>

        <div className="hud-join panel">
          <p className="hud-main-text">Join by comment</p>
          <p className="hud-sub-text">コメントで参加（YouTubeアプリから）</p>
        </div>
        <CommandGuideDock commands={data.commandGuides} />
      </div>
    </main>
  );
}
