'use client';

import Link from 'next/link';
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

  const updateQuestion = (index, key, value) => {
    setForm((prev) => {
      const next = [...prev.questions];
      next[index] = { ...next[index], [key]: value };
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
        <h1>Dot War Live Admin</h1>
        <p className="admin-help">Save to push live UI updates instantly.</p>

        <label className="admin-field">
          <span>Title EN</span>
          <input value={form.titleEn} onChange={(e) => setForm((prev) => ({ ...prev, titleEn: e.target.value }))} />
        </label>
        <label className="admin-field">
          <span>タイトル JP</span>
          <input value={form.titleJa} onChange={(e) => setForm((prev) => ({ ...prev, titleJa: e.target.value }))} />
        </label>

        <div className="admin-questions">
          <label className="admin-field">
            <span>Blue Team EN</span>
            <input value={form.blueTeamEn} onChange={(e) => setForm((prev) => ({ ...prev, blueTeamEn: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Blue Team JP</span>
            <input value={form.blueTeamJa} onChange={(e) => setForm((prev) => ({ ...prev, blueTeamJa: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Red Team EN</span>
            <input value={form.redTeamEn} onChange={(e) => setForm((prev) => ({ ...prev, redTeamEn: e.target.value }))} />
          </label>
          <label className="admin-field">
            <span>Red Team JP</span>
            <input value={form.redTeamJa} onChange={(e) => setForm((prev) => ({ ...prev, redTeamJa: e.target.value }))} />
          </label>
        </div>

        <label className="admin-field">
          <span>Start At</span>
          <input
            type="datetime-local"
            value={toLocalInputValue(form.startAt)}
            onChange={(e) => setForm((prev) => ({ ...prev, startAt: fromLocalInputValue(e.target.value) }))}
          />
        </label>

        <label className="admin-field">
          <span>Period Seconds</span>
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
            <div className="admin-question-pair" key={`q-${index}`}>
              <label className="admin-field">
                <span>{`Q${index + 1} EN`}</span>
                <input value={question.en} onChange={(e) => updateQuestion(index, 'en', e.target.value)} />
              </label>
              <label className="admin-field">
                <span>{`Q${index + 1} JP`}</span>
                <input value={question.ja} onChange={(e) => updateQuestion(index, 'ja', e.target.value)} />
              </label>
            </div>
          ))}
        </div>

        <div className="admin-actions">
          <button type="button" onClick={handleSave}>
            Save
          </button>
          {savedAt ? <p>{`Saved: ${savedAt}`}</p> : null}
          <Link href="/" className="stealth-link">game</Link>
        </div>
      </section>
    </main>
  );
}
