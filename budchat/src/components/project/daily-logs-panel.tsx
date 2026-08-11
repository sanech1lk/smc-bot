"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { CloudSun, FileText, Plus, Trash2, Users, X } from "lucide-react";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";
import type { DailyLogSummary, ProjectRole } from "@/types/models";

const WEATHER_KEYS = ["weather.clear", "weather.cloudy", "weather.rain", "weather.snow", "weather.wind", "weather.frost"];

export function DailyLogsPanel({ projectId, myRole }: { projectId: string; myRole: ProjectRole }) {
  const { t, locale } = useLocale();
  const [logs, setLogs] = useState<DailyLogSummary[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const canEdit = myRole !== "CLIENT";

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/daily-logs`);
    setLogs(res.ok ? (await res.json()).logs : []);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm(t("dailyLogs.deleteConfirm"))) return;
    const res = await fetch(`/api/daily-logs/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (logs === null) return <SkeletonList rows={3} height="h-28" />;

  return (
    <div className="space-y-3">
      {canEdit && (
        <button className="btn-secondary w-full" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? t("common.cancel") : t("dailyLogs.addCta")}
        </button>
      )}

      {formOpen && (
        <DailyLogForm
          projectId={projectId}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}

      {logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t("dailyLogs.emptyTitle")}
          description={canEdit ? t("dailyLogs.emptyDescriptionEditable") : t("dailyLogs.emptyDescriptionReadonly")}
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold capitalize">
                  {format(new Date(log.date), "d MMMM yyyy", { locale: dateFnsLocale(locale) })}
                </p>
                {canEdit && (
                  <button
                    onClick={() => remove(log.id)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                    aria-label={t("dailyLogs.deleteAria")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                {log.weather && (
                  <span className="inline-flex items-center gap-1.5">
                    <CloudSun size={14} />
                    {log.weather}
                    {log.temperature != null ? `, ${log.temperature}°` : ""}
                  </span>
                )}
                {log.crewCount != null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={14} />
                    {log.crewCount} {t("dailyLogs.crewCountSuffix")}
                  </span>
                )}
              </div>

              <p className="mt-2 whitespace-pre-wrap text-text-primary">{log.workDone}</p>

              {log.issues && (
                <p className="mt-2 rounded-xl bg-status-yellow/10 px-3 py-2 text-sm text-status-yellow">
                  {log.issues}
                </p>
              )}

              <p className="mt-2 text-xs text-text-muted">{log.author.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DailyLogForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const { t } = useLocale();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [weather, setWeather] = useState("");
  const [temperature, setTemperature] = useState("");
  const [crewCount, setCrewCount] = useState("");
  const [workDone, setWorkDone] = useState("");
  const [issues, setIssues] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`/api/projects/${projectId}/daily-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        weather: weather || undefined,
        temperature: temperature === "" ? undefined : Number(temperature),
        crewCount: crewCount === "" ? undefined : Number(crewCount),
        workDone,
        issues: issues || undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("dailyLogs.errorSave"));
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card space-y-3">
      <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

      <div className="flex flex-wrap gap-2">
        {WEATHER_KEYS.map((key) => {
          const label = t(key);
          return (
            <button
              type="button"
              key={key}
              onClick={() => setWeather(weather === label ? "" : label)}
              className={`chip py-1.5 text-sm transition-colors ${
                weather === label ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          type="number"
          placeholder={t("dailyLogs.temperaturePlaceholder")}
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder={t("dailyLogs.crewCountPlaceholder")}
          value={crewCount}
          onChange={(e) => setCrewCount(e.target.value)}
        />
      </div>

      <textarea
        className="input"
        rows={3}
        placeholder={t("dailyLogs.workDonePlaceholder")}
        required
        value={workDone}
        onChange={(e) => setWorkDone(e.target.value)}
      />
      <textarea
        className="input"
        rows={2}
        placeholder={t("dailyLogs.issuesPlaceholder")}
        value={issues}
        onChange={(e) => setIssues(e.target.value)}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-xs text-text-muted">{t("dailyLogs.overwriteNote")}</p>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? t("dailyLogs.saving") : t("dailyLogs.submit")}
      </button>
    </form>
  );
}
