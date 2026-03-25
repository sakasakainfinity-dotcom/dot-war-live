'use client';

import { useEffect, useMemo, useState } from 'react';

export function CountdownTimer({ intervalSeconds = 180, onUpdateTick }) {
  const [remainingSeconds, setRemainingSeconds] = useState(intervalSeconds);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setRemainingSeconds(intervalSeconds);
  }, [intervalSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsUpdating(true);
          setTimeout(() => setIsUpdating(false), 1200);
          onUpdateTick?.();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSeconds, onUpdateTick]);

  const mmss = useMemo(() => {
    const min = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const sec = String(remainingSeconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }, [remainingSeconds]);

  return (
    <section className={`panel timer-panel ${remainingSeconds <= 30 ? 'timer-alert' : ''}`}>
      <p className="timer-label hud-main-text">NEXT UPDATE</p>
      <p className="timer-sub-label hud-sub-text">次回更新</p>
      <p className="timer-value">{mmss}</p>
      {isUpdating && (
        <p className="timer-updating">
          <span className="hud-main-text">FRONTLINE MOVING</span>
          <span className="hud-sub-text">前線反映中</span>
        </p>
      )}
    </section>
  );
}
