"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, LayoutGrid, Plus } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { DashboardSummary } from "@/components/dashboard-summary";
import { EmptyState, SkeletonList } from "@/components/ui";
import type { ProjectSummary } from "@/types/models";

type View = "projects" | "dashboard";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>("projects");

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
    } else {
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="pb-28">
      <TopBar title="BudChat" showAccountActions />

      <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 flex gap-2 border-b border-border bg-bg/85 px-4 py-2 backdrop-blur-md">
        <ViewTab active={view === "projects"} onClick={() => setView("projects")} icon={Building2}>
          Объекты
        </ViewTab>
        <ViewTab active={view === "dashboard"} onClick={() => setView("dashboard")} icon={LayoutGrid}>
          Сводка
        </ViewTab>
      </div>

      {view === "dashboard" ? (
        <DashboardSummary />
      ) : (
        <div className="px-4 py-4">
          {projects === null && <SkeletonList rows={3} height="h-40" />}

          {projects !== null && projects.length === 0 && (
            <EmptyState
              icon={Building2}
              title="Пока нет объектов"
              description="Создайте первый объект стройки — этапы, чат и смета появятся автоматически."
              action={
                <button onClick={() => setDialogOpen(true)} className="btn-primary">
                  <Plus size={18} />
                  Создать объект
                </button>
              }
            />
          )}

          <div className="space-y-3">
            {projects?.map((project, i) => (
              <div key={project.id} className="animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "projects" && projects && projects.length > 0 && (
        <button
          onClick={() => setDialogOpen(true)}
          className="bottom-nav-safe fixed bottom-6 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-white shadow-raised transition-transform active:scale-95"
          aria-label="Новый объект"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  icon: Icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
        active ? "bg-brand text-white shadow-card" : "bg-bg-card text-text-secondary hover:text-text-primary"
      }`}
    >
      <Icon size={17} />
      {children}
    </button>
  );
}
