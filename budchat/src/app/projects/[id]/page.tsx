"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays, Layers, Map, Users } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { StageList } from "@/components/stage-list";
import { MembersPanel } from "@/components/members-panel";
import { VisitsCalendar } from "@/components/visits-calendar";
import { PlanPanel } from "@/components/plan-panel";
import { CurrencyPicker } from "@/components/currency-picker";
import { ErrorNote, SkeletonList } from "@/components/ui";
import type { ProjectMemberSummary, ProjectRole, StageSummary, VisitSummary } from "@/types/models";

type Tab = "stages" | "plan" | "members" | "calendar";

const TABS: { id: Tab; label: string; icon: typeof Layers }[] = [
  { id: "stages", label: "Этапы", icon: Layers },
  { id: "plan", label: "План", icon: Map },
  { id: "members", label: "Участники", icon: Users },
  { id: "calendar", label: "Календарь", icon: CalendarDays }
];

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
      setError("Не удалось загрузить объект");
      return;
    }
    const data = await res.json();
    setProject(data.project);
    setMyRole(data.myRole);
    setVisits(data.project.visits ?? []);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const loadVisits = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/visits`);
    if (res.ok) {
      const data = await res.json();
      setVisits(data.visits);
    }
  }, [projectId]);

  if (error) {
    return (
      <div>
        <TopBar title="Объект" backHref="/projects" />
        <div className="p-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <TopBar title="Объект" backHref="/projects" />
        <div className="px-4 py-4">
          <SkeletonList rows={5} height="h-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <TopBar title={project.name} subtitle={project.address} backHref="/projects" />

      <div className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 flex gap-2 overflow-x-auto border-b border-border bg-bg/85 px-4 py-2 backdrop-blur-md">
        {TABS.map(({ id, label, icon: Icon }) => (
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
            {label}
          </button>
        ))}
      </div>

      <div key={tab} className="animate-in px-4 py-4">
        {tab === "stages" && (
          <StageList projectId={project.id} stages={project.stages} myRole={myRole} onChange={loadProject} />
        )}
        {tab === "plan" && <PlanPanel projectId={project.id} stages={project.stages} myRole={myRole} />}
        {tab === "members" && (
          <div className="space-y-4">
            {myRole === "ADMIN" && (
              <CurrencyPicker
                projectId={project.id}
                value={project.currency}
                onChanged={loadProject}
              />
            )}
            <MembersPanel
              projectId={project.id}
              members={project.members}
              myRole={myRole}
              onChange={loadProject}
            />
          </div>
        )}
        {tab === "calendar" && (
          <VisitsCalendar
            projectId={project.id}
            visits={visits}
            stages={project.stages}
            canEdit={myRole !== "CLIENT"}
            onChange={loadVisits}
          />
        )}
      </div>
    </div>
  );
}
