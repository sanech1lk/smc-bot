"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { CalendarPlus, ChevronLeft, ChevronRight, Trash2, Truck, X } from "lucide-react";
import { ErrorNote } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";
import type { StageSummary, VisitSummary } from "@/types/models";

export function VisitsCalendar({
  projectId,
  visits,
  stages,
  canEdit,
  onChange
}: {
  projectId: string;
  visits: VisitSummary[];
  stages: StageSummary[];
  canEdit: boolean;
  onChange: () => void;
}) {
  const { t, locale } = useLocale();
  const [month, setMonth] = useState(() => new Date());
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [formOpen, setFormOpen] = useState(false);

  const weekdays = [
    t("visits.weekdayMon"),
    t("visits.weekdayTue"),
    t("visits.weekdayWed"),
    t("visits.weekdayThu"),
    t("visits.weekdayFri"),
    t("visits.weekdaySat"),
    t("visits.weekdaySun")
  ];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const visitsByDay = useMemo(() => {
    const map = new Map<string, VisitSummary[]>();
    for (const v of visits) {
      const key = format(new Date(v.date), "yyyy-MM-dd");
      map.set(key, [...(map.get(key) ?? []), v]);
    }
    return map;
  }, [visits]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedVisits = visitsByDay.get(selectedKey) ?? [];

  async function handleDelete(id: string) {
    if (!confirm(t("visits.deleteConfirm"))) return;
    const res = await fetch(`/api/visits/${id}`, { method: "DELETE" });
    if (res.ok) onChange();
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated"
            aria-label={t("visits.prevMonthAria")}
          >
            <ChevronLeft size={18} />
          </button>
          <p className="font-semibold capitalize">
            {format(month, "LLLL yyyy", { locale: dateFnsLocale(locale) })}
          </p>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-elevated"
            aria-label={t("visits.nextMonthAria")}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-text-muted">
          {weekdays.map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const hasVisit = visitsByDay.has(key);
            const inMonth = isSameMonth(day, month);
            const isSelected = isSameDay(day, selected);
            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                className={`relative aspect-square rounded-lg text-sm transition ${
                  isSelected ? "bg-brand text-white" : "active:bg-bg-elevated"
                } ${inMonth ? "" : "text-text-muted/50"}`}
              >
                {day.getDate()}
                {hasVisit && (
                  <span
                    className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                      isSelected ? "bg-white" : "bg-brand"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-semibold">{format(selected, "d MMMM", { locale: dateFnsLocale(locale) })}</p>
          {canEdit && (
            <button className="btn-secondary py-2 text-sm" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? <X size={16} /> : <CalendarPlus size={16} />}
              {formOpen ? t("common.cancel") : t("visits.addCta")}
            </button>
          )}
        </div>

        {formOpen && (
          <AddVisitForm
            projectId={projectId}
            date={selected}
            stages={stages}
            onCreated={() => {
              setFormOpen(false);
              onChange();
            }}
          />
        )}

        {selectedVisits.length === 0 && !formOpen && (
          <p className="text-text-secondary">{t("visits.noneScheduled")}</p>
        )}

        <div className="space-y-2">
          {selectedVisits.map((v) => (
            <div key={v.id} className="card flex items-start gap-3">
              <Truck size={22} className="mt-0.5 flex-shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{v.crewName || t("visits.crewFallback")}</p>
                {v.stage && (
                  <p className="text-sm text-text-secondary">
                    {t("visits.stagePrefix")} {v.stage.name}
                  </p>
                )}
                {v.note && <p className="text-sm text-text-secondary">{v.note}</p>}
                <p className="text-sm text-text-muted">{format(new Date(v.date), "HH:mm")}</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(v.id)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-status-red active:bg-status-red/10"
                  aria-label={t("visits.deleteVisitAria")}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddVisitForm({
  projectId,
  date,
  stages,
  onCreated
}: {
  projectId: string;
  date: Date;
  stages: StageSummary[];
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [time, setTime] = useState("09:00");
  const [crewName, setCrewName] = useState("");
  const [stageId, setStageId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const [hours, minutes] = time.split(":").map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours || 0, minutes || 0, 0, 0);

    const res = await fetch(`/api/projects/${projectId}/visits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: dateTime.toISOString(),
        crewName: crewName || undefined,
        stageId: stageId || undefined,
        note: note || undefined
      })
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(apiErrorMessage(t, data, "visits.errorCreate"));
      return;
    }

    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="card mb-3 space-y-3">
      <div className="flex gap-2">
        <input
          className="input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <input
          className="input"
          placeholder={t("visits.crewPlaceholder")}
          value={crewName}
          onChange={(e) => setCrewName(e.target.value)}
        />
      </div>
      <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
        <option value="">{t("visits.noStage")}</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <input
        className="input"
        placeholder={t("visits.notePlaceholder")}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <ErrorNote>{error}</ErrorNote>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? t("visits.submitCreating") : t("visits.submit")}
      </button>
    </form>
  );
}
