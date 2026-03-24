'use client';

import { useEffect, useState } from 'react';

export function SuperChatBanner({ chat, durationMs = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(timer);
  }, [chat, durationMs]);

  if (!visible) {
    return null;
  }

  return (
    <div className="superchat-wrap">
      <div className="panel superchat-panel">
        <p>
          <strong>{chat.user}</strong> <span>{chat.amount}</span> {chat.message}
        </p>
      </div>
    </div>
  );
}
