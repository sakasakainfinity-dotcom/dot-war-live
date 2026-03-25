'use client';

import { useEffect, useMemo, useState } from 'react';
import { createDefaultLiveSettings, normalizeLiveSettings, readLiveSettings, writeLiveSettings } from '../../lib/liveSettings';

function toLocalInputValue(iso) {
  const date = new Date(iso);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function fromLocalInputValue(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export default function AdminPage() {
  const defaults = useMemo(() => createDefaultLiveSettings(), []);
  const [form, setForm] = useState(defaults);
  const [savedAt, setSavedAt] = useState('');

  useEffect(() => {
    setForm(readLiveSettings());
  }, []);

  const updateQuestion = (index, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      next[index] = value;
      return { ...prev, questions: next };
    });
  };

  const handleSave = () => {
    const normalized = normalizeLiveSettings(form);
    writeLiveSettings(normalized);
    setForm(normalized);
    setSavedAt(new Date().toLocaleString('ja-JP', { hour12: false }));
  };

  return (
    <main className="admin-root">
      <section className="admin-card">
        <h1>Dot War Live 管理画面</h1>
        <p className="admin-help">配信設定を保存すると、配信画面（/）に即時反映されます。</p>

        <label className="admin-field">
          <span>大タイトル</span>
          <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
        </label>

        <label className="admin-field">
          <span>開始予定日時</span>
          <input
            type="datetime-local"
            value={toLocalInputValue(form.startAt)}
            onChange={(e) => setForm((prev) => ({ ...prev, startAt: fromLocalInputValue(e.target.value) }))}
          />
        </label>

        <label className="admin-field">
          <span>1ピリオドの秒数</span>
          <input
            type="number"
            min="10"
            step="1"
            value={form.periodDurationSec}
            onChange={(e) => setForm((prev) => ({ ...prev, periodDurationSec: e.target.value }))}
          />
        </label>

        <div className="admin-questions">
          {form.questions.map((question, index) => (
            <label className="admin-field" key={`q-${index}`}>
              <span>{`質問${index + 1}`}</span>
              <input value={question} onChange={(e) => updateQuestion(index, e.target.value)} />
            </label>
          ))}
        </div>

        <div className="admin-actions">
          <button type="button" onClick={handleSave}>
            保存
          </button>
          {savedAt ? <p>{`保存済み: ${savedAt}`}</p> : null}
        </div>
      </section>
    </main>
  );
}
