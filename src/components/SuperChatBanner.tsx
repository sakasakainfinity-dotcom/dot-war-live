'use client';

import { useEffect, useState } from 'react';
import type { SuperChatData } from '../lib/mockData';

interface SuperChatBannerProps {
  chat: SuperChatData;
  durationMs?: number;
}

export function SuperChatBanner({ chat, durationMs = 5000 }: SuperChatBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [chat, durationMs]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 w-[84%] max-w-4xl -translate-x-1/2">
      <div className="relative overflow-hidden rounded-xl border border-amber-300/70 bg-slate-950/85 px-4 py-2.5 shadow-[0_0_24px_rgba(251,191,36,0.35)] backdrop-blur-md md:px-6">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,191,36,0.2)_0%,rgba(248,113,113,0.18)_55%,rgba(251,191,36,0.24)_100%)]" />
        <p className="relative flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-sm font-black md:text-lg">
          <span className="text-amber-100">{chat.user}</span>
          <span className="text-amber-300">{chat.amount}</span>
          <span className="text-slate-100">{chat.message}</span>
        </p>
      </div>
    </div>
  );
}
