"use client";

import { useEffect, useState } from "react";

const TOGGLES = [
  { key: "citationAlerts", title: "New Citation Alerts", desc: "Receive alerts when tracked patents receive new prior-art matches." },
  { key: "proximityWarnings", title: "Prior-Art Proximity Warnings", desc: "Notify when a new upload matches existing corpus entries closely." },
  { key: "weeklySummary", title: "Weekly Lab Summary", desc: "An automated summary of your weekly analysis activity." },
] as const;

export function SettingsForm({ name, email }: { name: string; email: string }) {
  const [fullName, setFullName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    citationAlerts: true,
    proximityWarnings: true,
    weeklySummary: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem("notificationPrefs");
    if (stored) setToggles(JSON.parse(stored));
  }, []);

  function toggle(key: string) {
    const next = { ...toggles, [key]: !toggles[key] };
    setToggles(next);
    localStorage.setItem("notificationPrefs", JSON.stringify(next));
  }

  async function saveProfile() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8">
        <h3 className="mb-6 flex items-center gap-2 border-b border-outline-variant pb-4 text-xl font-semibold text-on-surface">
          <span className="material-symbols-outlined text-primary">person</span>
          Account Profile
        </h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col">
            <label className="mb-1 font-mono text-sm text-on-surface-variant">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-0 border-b border-outline-variant bg-transparent py-2 focus:border-primary focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex flex-col md:col-span-2">
            <label className="mb-1 font-mono text-sm text-on-surface-variant">Email Address</label>
            <input
              value={email}
              disabled
              className="border-0 border-b border-outline-variant bg-transparent py-2 font-mono text-on-surface-variant opacity-70"
            />
          </div>
        </div>
        <div className="mt-8 flex items-center justify-end gap-3">
          {saved && <span className="font-mono text-xs text-primary">Saved</span>}
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="rounded bg-primary px-6 py-2 font-mono text-sm text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-8">
        <h3 className="mb-6 flex items-center gap-2 border-b border-outline-variant pb-4 text-xl font-semibold text-on-surface">
          <span className="material-symbols-outlined text-primary">notifications_active</span>
          Notification Preferences
        </h3>
        <div className="flex flex-col gap-6">
          {TOGGLES.map((t, i) => (
            <div key={t.key}>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-on-surface">{t.title}</h4>
                  <p className="mt-1 text-sm text-on-surface-variant">{t.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={toggles[t.key]}
                  onClick={() => toggle(t.key)}
                  className={`h-6 w-12 rounded-full transition-colors ${
                    toggles[t.key] ? "bg-primary" : "bg-surface-container-high"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                      toggles[t.key] ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {i < TOGGLES.length - 1 && <div className="mt-6 h-px w-full bg-outline-variant/50" />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
