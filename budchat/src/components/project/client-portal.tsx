"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { AlertTriangle, CalendarClock, Check, FileText, Images, ScrollText, Wallet } from "lucide-react";
import { SignaturePad } from "@/components/stage/signature-pad";
import { formatAmount, getCurrency } from "@/lib/currency";
import { StatusDot } from "@/components/status-dot";
import { ErrorNote, SkeletonList } from "@/components/ui";
import { STAGE_STATUS_KEY } from "@/lib/stages";
import { useLocale } from "@/components/locale-provider";
import { dateFnsLocale } from "@/lib/i18n/date-fns-locale";
import type { ChangeOrderSummary, ProjectRole, StageSummary } from "@/types/models";

interface PortalData {
  project: { id: string; name: string; address: string; status: string };
  currency: string;
  myRole: ProjectRole;
  progress: { done: number; total: number; percent: number };
  stages: StageSummary[];
  photos: { id: string; url: string; tag: string; createdAt: string; stage: { name: string } }[];
  money: { estimateTotal: number; approvedChanges: number; grandTotal: number };
  changeOrders: ChangeOrderSummary[];
  pendingChangeOrders: number;
  openPunch: number;
  lastLog: { date: string; workDone: string; author: { name: string } } | null;
  nextVisit: { date: string; crewName: string | null; stage: { name: string } | null } | null;
}

/**
 * What the customer sees: progress, money agreed, recent photos and anything
 * waiting on their signature — without the crew's timesheets or task board.
 */
export function ClientPortal({ projectId }: { projectId: string }) {
  const { t, locale } = useLocale();
  const [data, setData] = useState<PortalData | null>(null);
  const [signing, setSigning] = useState<ChangeOrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/portal`);
    if (res.ok) setData(await res.json());
    else setError(t("portal.errorLoad"));
  }, [projectId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(order: ChangeOrderSummary, status: "APPROVED" | "REJECTED", signature?: string) {
    const res = await fetch(`/api/change-orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, signatureData: signature })
    });
    if (res.ok) {
      setSigning(null);
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("changeOrders.errorDecide"));
    }
  }

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <SkeletonList rows={4} height="h-28" />;

  const symbol = getCurrency(data.currency).symbol;
  const pending = data.changeOrders.filter((o) => o.status === "PENDING");

  return (
    <div className="animate-in space-y-4">
      <div className="card">
        <p className="label">{t("portal.readiness")}</p>
        <div className="mt-2 flex items-end gap-3">
          <p className="text-4xl font-bold leading-none tabular text-brand">{data.progress.percent}%</p>
          <p className="pb-1 text-sm text-text-secondary">
            {t("portal.stagesOfTotal", { done: data.progress.done, total: data.progress.total })}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full rounded-full bg-brand transition-all duration-500"
            style={{ width: `${data.progress.percent}%` }}
          />
        </div>
      </div>

      <div className="card">
        <p className="flex items-center gap-2 font-semibold">
          <Wallet size={18} className="text-text-secondary" />
          {t("portal.costTitle")}
        </p>
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">{t("portal.estimateLabel")}</span>
            <span className="tabular">
              {formatAmount(data.money.estimateTotal, data.currency)} {symbol}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">{t("portal.approvedChangesLabel")}</span>
            <span className="tabular">
              {formatAmount(data.money.approvedChanges, data.currency)} {symbol}
            </span>
          </div>
          <div className="flex justify-between border-t border-border-soft pt-1.5 text-base font-bold">
            <span>{t("portal.totalLabel")}</span>
            <span className="tabular text-brand">
              {formatAmount(data.money.grandTotal, data.currency)} {symbol}
            </span>
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-status-yellow">
            <ScrollText size={16} />
            {t("portal.pendingDecisionTitle", { count: pending.length })}
          </h2>
          <div className="space-y-2">
            {pending.map((order) => (
              <div key={order.id} className="card">
                <p className="text-xs font-semibold text-text-muted">
                  {t("changeOrders.numberPrefix")}
                  {order.number}
                </p>
                <p className="mt-0.5 font-semibold">{order.title}</p>
                {order.description && (
                  <p className="mt-1 text-sm text-text-secondary">{order.description}</p>
                )}
                <p className="mt-2 text-lg font-bold tabular">
                  {formatAmount(order.amount, data.currency)} {symbol}
                </p>
                <div className="mt-3 flex gap-2">
                  <button className="btn-primary flex-1 py-2.5 text-sm" onClick={() => setSigning(order)}>
                    <Check size={16} />
                    {t("changeOrders.approveCta")}
                  </button>
                  <button
                    className="btn-secondary flex-1 py-2.5 text-sm"
                    onClick={() => decide(order, "REJECTED")}
                  >
                    {t("changeOrders.rejectCta")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        {data.nextVisit && (
          <div className="card">
            <CalendarClock size={18} className="text-accent" />
            <p className="mt-2 text-sm font-semibold">
              {format(new Date(data.nextVisit.date), "d MMM, HH:mm", { locale: dateFnsLocale(locale) })}
            </p>
            <p className="text-xs text-text-muted">
              {data.nextVisit.crewName || t("portal.nextVisitFallback")}
            </p>
          </div>
        )}
        {data.openPunch > 0 && (
          <div className="card">
            <AlertTriangle size={18} className="text-status-red" />
            <p className="mt-2 text-2xl font-bold leading-none tabular text-status-red">{data.openPunch}</p>
            <p className="mt-1 text-xs text-text-muted">{t("portal.openPunchLabel")}</p>
          </div>
        )}
      </div>

      {data.lastLog && (
        <div className="card">
          <p className="flex items-center gap-2 font-semibold">
            <FileText size={18} className="text-text-secondary" />
            {t("portal.lastLogTitle")}
          </p>
          <p className="mt-1.5 text-sm text-text-muted">
            {format(new Date(data.lastLog.date), "d MMMM", { locale: dateFnsLocale(locale) })} ·{" "}
            {data.lastLog.author.name}
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm">{data.lastLog.workDone}</p>
        </div>
      )}

      {data.photos.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-secondary">
            <Images size={16} />
            {t("portal.recentPhotosTitle")}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {data.photos.map((photo) => (
              <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-bg-card">
                <Image src={photo.url} alt="" fill className="object-cover" sizes="120px" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-text-secondary">{t("portal.stagesTitle")}</h2>
        <div className="space-y-2">
          {data.stages.map((stage) => (
            <Link
              key={stage.id}
              href={`/projects/${projectId}/stages/${stage.id}`}
              className="card flex items-center gap-3 transition-transform active:scale-[0.99]"
            >
              <StatusDot status={stage.status} />
              <span className="min-w-0 flex-1 truncate font-semibold">{stage.name}</span>
              <span className="flex-shrink-0 text-sm text-text-muted">
                {t(STAGE_STATUS_KEY[stage.status])}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {error && <ErrorNote>{error}</ErrorNote>}

      {signing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setSigning(null)}
        >
          <div
            className="animate-sheet w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-5 shadow-overlay sm:my-8 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">
              {t("changeOrders.signSheetTitle")}
              {signing.number}
            </h3>
            <p className="mt-1 text-text-secondary">{signing.title}</p>
            <p className="mt-2 text-xl font-bold tabular text-brand">
              {formatAmount(signing.amount, data.currency)} {symbol}
            </p>
            <p className="mb-2 mt-3 text-sm text-text-secondary">{t("changeOrders.signHint")}</p>
            <SignaturePad onSave={(dataUrl) => decide(signing, "APPROVED", dataUrl)} />
            <button className="btn-ghost mt-3 w-full" onClick={() => setSigning(null)}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
