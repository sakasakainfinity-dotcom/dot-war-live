'use client';

import { useEffect, useMemo, useState } from 'react';
import { battleMockData } from '../lib/mockData';
import { BattleGrid } from './BattleGrid';
import { CommandBar } from './CommandGuideDock';
import { CountdownTimer } from './CountdownTimer';
import { MatchTitle } from './MatchTitle';
import { SuperChatBanner } from './SuperChatBanner';
import { TeamTank } from './TeamTank';
import { TopRankingPanel } from './TopRankingPanel';

const GAUGE_MIN = -5;
const GAUGE_MAX = 15;

const COMMAND_EFFECTS = {
  A: { blueDelta: 1, redDelta: 0 },
  AA: { blueDelta: 0, redDelta: -1 },
  '300A': { blueDelta: 3, redDelta: 0 },
  '500A': { blueDelta: 0, redDelta: -5 },
  B: { blueDelta: 0, redDelta: 1 },
  BB: { blueDelta: -1, redDelta: 0 },
  '300B': { blueDelta: 0, redDelta: 3 },
  '500B': { blueDelta: -5, redDelta: 0 },
};

function clampGauge(value) {
  return Math.max(GAUGE_MIN, Math.min(GAUGE_MAX, value));
}

export function BattleLayout({ data = battleMockData }) {
  const [grid, setGrid] = useState(data.grid);
  const [blueGauge, setBlueGauge] = useState(data.blueTank);
  const [redGauge, setRedGauge] = useState(data.redTank);
  const [superChat, setSuperChat] = useState(data.superChat);

  const commands = useMemo(() => data.commandGuides.map((item) => item.code), [data.commandGuides]);

  const applyCommand = (commandCode) => {
    const effect = COMMAND_EFFECTS[commandCode];
    if (!effect) return;

    setBlueGauge((prev) => clampGauge(prev + effect.blueDelta));
    setRedGauge((prev) => clampGauge(prev + effect.redDelta));

    const commandMeta = data.commandGuides.find((item) => item.code === commandCode);
    if (commandMeta) {
      setSuperChat({
        user: 'Live Chat',
        amount: commandCode,
        message: `${commandMeta.labelEn} / ${commandMeta.labelJa}`,
      });
    }
  };

  useEffect(() => {
    const liveTicker = setInterval(() => {
      const randomCode = commands[Math.floor(Math.random() * commands.length)];
      applyCommand(randomCode);
    }, 2200);

    return () => clearInterval(liveTicker);
  }, [commands]);

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
          <TopRankingPanel ranking={data.ranking} />
          <CountdownTimer
            initialSeconds={data.timerSeconds}
            intervalSeconds={data.updateIntervalSeconds}
            onUpdateTick={handleUpdateTick}
          />
        </section>

        <SuperChatBanner chat={superChat} />

        <section className="hud-center">
          <TeamTank team="blue" min={GAUGE_MIN} max={GAUGE_MAX} currentValue={blueGauge} />
          <div className="hud-grid-wrap">
            <BattleGrid grid={grid} />
          </div>
          <TeamTank team="red" min={GAUGE_MIN} max={GAUGE_MAX} currentValue={redGauge} />
        </section>

        <div className="hud-join panel">
          <p className="hud-main-text">Join by comment</p>
          <p className="hud-sub-text">コメントで参加</p>
        </div>
        <CommandBar commands={data.commandGuides} />
      </div>
    </main>
  );
}
