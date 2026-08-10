"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CloudSun, FileText, Plus, Trash2, Users, X } from "lucide-react";
import { EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import type { DailyLogSummary, ProjectRole } from "@/types/models";

const WEATHER_PRESETS = ["Ясно", "Облачно", "Дождь", "Снег", "Ветер", "Мороз"];

export function DailyLogsPanel({ projectId, myRole }: { projectId: string; myRole: ProjectRole }) {
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
    if (!confirm("Удалить отчёт за этот день?")) return;
    const res = await fetch(`/api/daily-logs/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (logs === null) return <SkeletonList rows={3} height="h-28" />;

  return (
    <div className="space-y-3">
      {canEdit && (
        <button className="btn-secondary w-full" onClick={() => setFormOpen((v) => !v)}>
          {formOpen ? <X size={17} /> : <Plus size={17} />}
          {formOpen ? "Отмена" : "Отчёт за день"}
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
          title="Отчётов пока нет"
          description={
            canEdit
              ? "Один короткий отчёт в день — погода, сколько человек вышло, что сделано. Его можно показать заказчику."
              : "Подрядчик ещё не заполнял ежедневные отчёты."
          }
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold capitalize">
                  {format(new Date(log.date), "d MMMM yyyy", { locale: ru })}
                </p>
                {canEdit && (
                  <button
                    onClick={() => remove(log.id)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                    aria-label="Удалить отчёт"
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
                    {log.crewCount} чел.
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
      setError(data.error ?? "Не удалось сохранить отчёт");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="animate-in card space-y-3">
      <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />

      <div className="flex flex-wrap gap-2">
        {WEATHER_PRESETS.map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => setWeather(weather === w ? "" : w)}
            className={`chip py-1.5 text-sm transition-colors ${
              weather === w ? "bg-brand text-white" : "bg-bg-elevated text-text-secondary"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          className="input"
          type="number"
          placeholder="Температура, °C"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Человек на объекте"
          value={crewCount}
          onChange={(e) => setCrewCount(e.target.value)}
        />
      </div>

      <textarea
        className="input"
        rows={3}
        placeholder="Что сделано за день"
        required
        value={workDone}
        onChange={(e) => setWorkDone(e.target.value)}
      />
      <textarea
        className="input"
        rows={2}
        placeholder="Проблемы, простои (необязательно)"
        value={issues}
        onChange={(e) => setIssues(e.target.value)}
      />

      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-xs text-text-muted">
        Если отчёт за эту дату уже есть, он будет заменён.
      </p>
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Сохраняем…" : "Сохранить отчёт"}
      </button>
    </form>
  );
}
