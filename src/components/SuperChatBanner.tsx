'use client';

import { useEffect, useState } from 'react';
import type { SuperChatData } from '@/lib/mockData';

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
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[80%] max-w-3xl -translate-x-1/2 rounded-lg border border-amber-300/70 bg-amber-500/20 px-4 py-2 backdrop-blur-sm">
      <p className="text-center text-sm font-black text-amber-100 md:text-base">
        <span className="mr-2 text-amber-200">{chat.user}</span>
        <span className="mr-3 text-amber-300">{chat.amount}</span>
        <span>{chat.message}</span>
      </p>
    </div>
  );
}
