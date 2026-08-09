"use client";

import { useCallback, useEffect, useState } from "react";
import { TopBar } from "@/components/top-bar";
import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { NotificationsToggle } from "@/components/notifications-toggle";
import type { ProjectSummary } from "@/types/models";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="pb-24">
      <TopBar title="Объекты" right={<NotificationsToggle />} />

      <div className="px-4 py-4">
        {projects === null && <p className="text-center text-text-secondary">Загрузка…</p>}

        {projects !== null && projects.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-4xl">🏗️</p>
            <p className="mt-3 text-lg font-semibold">Пока нет объектов</p>
            <p className="mt-1 text-text-secondary">Создайте первый объект стройки</p>
          </div>
        )}

        <div className="space-y-3">
          {projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      <button
        onClick={() => setDialogOpen(true)}
        className="fixed bottom-6 right-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-3xl font-bold text-white shadow-card active:scale-95"
        aria-label="Новый объект"
      >
        +
      </button>

      <NewProjectDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </div>
  );
}
