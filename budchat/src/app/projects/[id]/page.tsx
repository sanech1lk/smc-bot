"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TopBar } from "@/components/top-bar";
import { StageList } from "@/components/stage-list";
import { MembersPanel } from "@/components/members-panel";
import { VisitsCalendar } from "@/components/visits-calendar";
import { PlanPanel } from "@/components/plan-panel";
import type { ProjectMemberSummary, ProjectRole, StageSummary, VisitSummary } from "@/types/models";

type Tab = "stages" | "plan" | "members" | "calendar";

interface ProjectDetail {
  id: string;
  name: string;
  address: string;
  status: string;
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
      <div className="p-6 text-center text-status-red">
        {error}
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <TopBar title="Объект" backHref="/projects" />
        <p className="p-6 text-center text-text-secondary">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="pb-10">
      <TopBar title={project.name} backHref="/projects" />

      <div className="border-b border-border px-4 py-3">
        <p className="text-text-secondary">{project.address}</p>
      </div>

      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 flex gap-2 overflow-x-auto border-b border-border bg-bg px-4 py-2">
        <TabButton active={tab === "stages"} onClick={() => setTab("stages")}>
          Этапы
        </TabButton>
        <TabButton active={tab === "plan"} onClick={() => setTab("plan")}>
          План
        </TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>
          Участники
        </TabButton>
        <TabButton active={tab === "calendar"} onClick={() => setTab("calendar")}>
          Календарь
        </TabButton>
      </div>

      <div className="px-4 py-4">
        {tab === "stages" && (
          <StageList projectId={project.id} stages={project.stages} myRole={myRole} onChange={loadProject} />
        )}
        {tab === "plan" && <PlanPanel projectId={project.id} stages={project.stages} myRole={myRole} />}
        {tab === "members" && (
          <MembersPanel
            projectId={project.id}
            members={project.members}
            myRole={myRole}
            onChange={loadProject}
          />
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

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-xl px-4 py-2.5 font-semibold transition ${
        active ? "bg-brand text-white" : "bg-bg-card text-text-secondary"
      }`}
    >
      {children}
    </button>
  );
}
