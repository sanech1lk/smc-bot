"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Clock, Play, Square, Trash2 } from "lucide-react";
import { Avatar, EmptyState, ErrorNote, SkeletonList } from "@/components/ui";
import { formatDuration, shiftMinutes } from "@/lib/field-ops";
import type { ProjectRole, ShiftSummary, StageSummary } from "@/types/models";

/** Best-effort position so a shift can be tied to the site; never blocks. */
function currentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    const timer = setTimeout(() => resolve(null), 5000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  });
}

export function ShiftsPanel({
  projectId,
  stages,
  myRole
}: {
  projectId: string;
  stages: StageSummary[];
  myRole: ProjectRole;
}) {
  const [shifts, setShifts] = useState<ShiftSummary[] | null>(null);
  const [openShift, setOpenShift] = useState<ShiftSummary | null>(null);
  const [canSeeAll, setCanSeeAll] = useState(false);
  const [stageId, setStageId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/shifts`);
    if (res.ok) {
      const data = await res.json();
      setShifts(data.shifts);
      setOpenShift(data.openShift);
      setCanSeeAll(data.canSeeAll);
    } else {
      setShifts([]);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Live timer for the running shift.
  useEffect(() => {
    if (!openShift) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [openShift]);

  async function startShift() {
    setBusy(true);
    setError(null);
    const pos = await currentPosition();
    const res = await fetch(`/api/projects/${projectId}/shifts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stageId: stageId || undefined,
        lat: pos?.coords.latitude,
        lng: pos?.coords.longitude
      })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось открыть смену");
      return;
    }
    load();
  }

  async function endShift() {
    if (!openShift) return;
    setBusy(true);
    setError(null);
    const pos = await currentPosition();
    const res = await fetch(`/api/shifts/${openShift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: pos?.coords.latitude, lng: pos?.coords.longitude })
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось закрыть смену");
      return;
    }
    load();
  }

  async function removeShift(id: string) {
    if (!confirm("Удалить запись о смене?")) return;
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (shifts === null) return <SkeletonList rows={3} height="h-20" />;

  const closed = shifts.filter((s) => s.endedAt);
  const totalMinutes = closed.reduce(
    (sum, s) => sum + (shiftMinutes(s.startedAt, s.endedAt) ?? 0),
    0
  );
  const canTrack = myRole !== "CLIENT";

  return (
    <div className="space-y-4">
      {canTrack && (
        <div className="card space-y-3">
          {openShift ? (
            <>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-status-green/15 text-status-green">
                  <Clock size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Смена идёт</p>
                  <p className="text-sm text-text-secondary">
                    с {format(new Date(openShift.startedAt), "HH:mm")} ·{" "}
                    {formatDuration(shiftMinutes(openShift.startedAt, new Date(now)) ?? 0)}
                    {openShift.stage ? ` · ${openShift.stage.name}` : ""}
                  </p>
                </div>
              </div>
              <button className="btn-danger w-full" onClick={endShift} disabled={busy}>
                <Square size={17} fill="currentColor" />
                {busy ? "Закрываем…" : "Закрыть смену"}
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold">Учёт рабочего времени</p>
              <select className="input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                <option value="">Без привязки к этапу</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button className="btn-primary w-full" onClick={startShift} disabled={busy}>
                <Play size={17} fill="currentColor" />
                {busy ? "Открываем…" : "Начать смену"}
              </button>
              <p className="text-xs text-text-muted">
                Место фиксируется при открытии и закрытии смены, если разрешена геолокация.
              </p>
            </>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
        </div>
      )}

      {closed.length > 0 && (
        <div className="card flex items-center justify-between">
          <div>
            <p className="label">{canSeeAll ? "Всего по бригаде" : "Всего у вас"}</p>
            <p className="mt-1 text-2xl font-bold tabular">{formatDuration(totalMinutes)}</p>
          </div>
          <span className="text-sm text-text-muted">{closed.length} смен</span>
        </div>
      )}

      {shifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Смен пока нет"
          description={canTrack ? "Откройте смену, когда придёте на объект." : undefined}
        />
      ) : (
        <div className="space-y-2">
          {shifts.map((s) => {
            const minutes = shiftMinutes(s.startedAt, s.endedAt);
            return (
              <div key={s.id} className="card flex items-center gap-3">
                <Avatar name={s.user?.name ?? "?"} id={s.userId} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{s.user?.name ?? "Вы"}</p>
                  <p className="truncate text-sm text-text-secondary">
                    {format(new Date(s.startedAt), "d MMM, HH:mm", { locale: ru })}
                    {s.endedAt ? ` – ${format(new Date(s.endedAt), "HH:mm")}` : " · идёт"}
                    {s.stage ? ` · ${s.stage.name}` : ""}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 text-sm font-semibold tabular ${
                    minutes === null ? "text-status-green" : "text-text-primary"
                  }`}
                >
                  {minutes === null ? "идёт" : formatDuration(minutes)}
                </span>
                {myRole === "ADMIN" && (
                  <button
                    onClick={() => removeShift(s.id)}
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-status-red"
                    aria-label="Удалить смену"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
