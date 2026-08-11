"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  Layers,
  Map,
  Package,
  ScrollText,
  UserCircle,
  Users
} from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { StageList } from "@/components/stage-list";
import { MembersPanel } from "@/components/members-panel";
import { VisitsCalendar } from "@/components/visits-calendar";
import { PlanPanel } from "@/components/plan-panel";
import { CurrencyPicker } from "@/components/currency-picker";
import { ShiftsPanel } from "@/components/project/shifts-panel";
import { DailyLogsPanel } from "@/components/project/daily-logs-panel";
import { ChangeOrdersPanel } from "@/components/project/change-orders-panel";
import { PunchPanel } from "@/components/project/punch-panel";
import { MaterialsPanel } from "@/components/project/materials-panel";
import { DocumentsPanel } from "@/components/project/documents-panel";
import { ClientPortal } from "@/components/project/client-portal";
import { ErrorNote, SkeletonList } from "@/components/ui";
import { useLocale } from "@/components/locale-provider";
import type { ProjectMemberSummary, ProjectRole, StageSummary, VisitSummary } from "@/types/models";

type Tab =
  | "portal"
  | "stages"
  | "logs"
  | "changes"
  | "punch"
  | "shifts"
  | "materials"
  | "documents"
  | "plan"
  | "calendar"
  | "members";

const TAB_ICON: Record<Tab, typeof Layers> = {
  portal: UserCircle,
  stages: Layers,
  logs: FileText,
  changes: ScrollText,
  punch: ClipboardCheck,
  shifts: Clock,
  materials: Package,
  documents: FolderOpen,
  plan: Map,
  calendar: CalendarDays,
  members: Users
};

const TAB_KEY: Record<Tab, string> = {
  portal: "projectDetail.tabPortal",
  stages: "projectDetail.tabStages",
  logs: "projectDetail.tabLogs",
  changes: "projectDetail.tabChanges",
  punch: "projectDetail.tabPunch",
  shifts: "projectDetail.tabShifts",
  materials: "projectDetail.tabMaterials",
  documents: "projectDetail.tabDocuments",
  plan: "projectDetail.tabPlan",
  calendar: "projectDetail.tabCalendar",
  members: "projectDetail.tabMembers"
};

const TAB_ORDER: Tab[] = [
  "portal",
  "stages",
  "logs",
  "changes",
  "punch",
  "shifts",
  "materials",
  "documents",
  "plan",
  "calendar",
  "members"
];

// The customer only needs the curated view plus the shared records; the
// crew's timesheets and material costs stay internal.
const CLIENT_TABS: Tab[] = ["portal", "stages", "logs", "changes", "punch", "documents", "plan", "calendar"];

interface ProjectDetail {
  id: string;
  name: string;
  address: string;
  status: string;
  currency: string;
  stages: StageSummary[];
  members: ProjectMemberSummary[];
}

export default function ProjectDetailPage() {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [myRole, setMyRole] = useState<ProjectRole>("WORKER");
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [tab, setTab] = useState<Tab>("stages");
  const [error, setError] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) {
      setError(t("projectDetail.errorLoad"));
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setMyRole(data.myRole);
    setVisits(data.project.visits ?? []);
    // The customer lands on their own overview rather than the crew's stage list.
    if (data.myRole === "CLIENT") setTab((current) => (current === "stages" ? "portal" : current));
  }, [projectId, t]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const loadVisits = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/visits`);
    if (res.ok) setVisits((await res.json()).visits);
  }, [projectId]);

  if (error) {
    return (
      <div>
        <TopBar title={t("projectDetail.fallbackTitle")} backHref="/projects" />
        <div className="p-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <TopBar title={t("projectDetail.fallbackTitle")} backHref="/projects" />
        <div className="px-4 py-4">
          <SkeletonList rows={5} height="h-16" />
        </div>
      </div>
    );
  }

  const visibleTabs = myRole === "CLIENT" ? TAB_ORDER.filter((id) => CLIENT_TABS.includes(id)) : TAB_ORDER;

  return (
    <div className="pb-10">
      <TopBar title={project.name} subtitle={project.address} backHref="/projects" />

      <div className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 flex gap-2 overflow-x-auto border-b border-border bg-bg/85 px-4 py-2 backdrop-blur-xl">
        {visibleTabs.map((id) => {
          const Icon = TAB_ICON[id];
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-brand text-white shadow-card"
                  : "bg-bg-card text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={16} />
              {t(TAB_KEY[id])}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-in px-4 py-4">
        {tab === "portal" && <ClientPortal projectId={project.id} />}
        {tab === "stages" && (
          <StageList projectId={project.id} stages={project.stages} myRole={myRole} onChange={loadProject} />
        )}
        {tab === "logs" && <DailyLogsPanel projectId={project.id} myRole={myRole} />}
        {tab === "changes" && (
          <ChangeOrdersPanel projectId={project.id} stages={project.stages} myRole={myRole} />
        )}
        {tab === "punch" && (
          <PunchPanel
            projectId={project.id}
            stages={project.stages}
            members={project.members}
            myRole={myRole}
          />
        )}
        {tab === "shifts" && (
          <ShiftsPanel projectId={project.id} stages={project.stages} myRole={myRole} />
        )}
        {tab === "materials" && (
          <MaterialsPanel projectId={project.id} stages={project.stages} myRole={myRole} />
        )}
        {tab === "documents" && <DocumentsPanel projectId={project.id} myRole={myRole} />}
        {tab === "plan" && <PlanPanel projectId={project.id} stages={project.stages} myRole={myRole} />}
        {tab === "calendar" && (
          <VisitsCalendar
            projectId={project.id}
            visits={visits}
            stages={project.stages}
            canEdit={myRole !== "CLIENT"}
            onChange={loadVisits}
          />
        )}
        {tab === "members" && (
          <div className="space-y-4">
            {myRole === "ADMIN" && (
              <CurrencyPicker projectId={project.id} value={project.currency} onChanged={loadProject} />
            )}
            <MembersPanel
              projectId={project.id}
              members={project.members}
              myRole={myRole}
              onChange={loadProject}
            />
          </div>
        )}
      </div>
    </div>
  );
}
