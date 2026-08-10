"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Hammer,
  Truck
} from "lucide-react";
import { EmptyState, Skeleton, SkeletonList } from "@/components/ui";

interface StageRef {
  id: string;
  name: string;
  projectId: string;
  project: { name: string };
}

interface DashboardData {
  stats: {
    projects: number;
    activeStages: number;
    problemStages: number;
    overdueTasks: number;
    myOpenTasks: number;
  };
  problemStages: { id: string; name: string; projectId: string; project: { name: string } }[];
  overdueTasks: {
    id: string;
    title: string;
    deadline: string | null;
    assignee: { id: string; name: string } | null;
    stage: StageRef;
  }[];
  myTasks: { id: string; title: string; deadline: string | null; stage: StageRef }[];
  upcomingVisits: {
    id: string;
    date: string;
    crewName: string | null;
    note: string | null;
    projectId: string;
    project: { name: string };
    stage: { id: string; name: string } | null;
  }[];
}

export function DashboardSummary() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dashboard");
      if (res.ok) setData(await res.json());
    })();
  }, []);

  if (!data) {
    return (
      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <SkeletonList rows={2} height="h-20" />
      </div>
    );
  }

  const { stats } = data;
  const allClear =
    stats.problemStages === 0 && stats.overdueTasks === 0 && stats.myOpenTasks === 0;

  return (
    <div className="animate-in space-y-5 px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile icon={Hammer} label="Этапов в работе" value={stats.activeStages} tone="accent" />
        <StatTile
          icon={AlertTriangle}
          label="Проблемных этапов"
          value={stats.problemStages}
          tone={stats.problemStages > 0 ? "red" : "muted"}
        />
        <StatTile
          icon={Clock}
          label="Просрочено задач"
          value={stats.overdueTasks}
          tone={stats.overdueTasks > 0 ? "yellow" : "muted"}
        />
        <StatTile icon={ClipboardList} label="Мои задачи" value={stats.myOpenTasks} tone="muted" />
      </div>

      {allClear && (
        <EmptyState
          icon={CheckCircle2}
          title="Всё под контролем"
          description="Нет проблемных этапов, просроченных и назначенных на вас задач."
        />
      )}

      {data.problemStages.length > 0 && (
        <Section title="Требуют внимания" icon={AlertTriangle} tone="text-status-red">
          {data.problemStages.map((stage) => (
            <Link
              key={stage.id}
              href={`/projects/${stage.projectId}/stages/${stage.id}`}
              className="card flex items-center gap-3 transition-transform active:scale-[0.99]"
            >
              <span className="status-dot bg-status-red" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{stage.name}</p>
                <p className="truncate text-sm text-text-secondary">{stage.project.name}</p>
              </div>
            </Link>
          ))}
        </Section>
      )}

      {data.overdueTasks.length > 0 && (
        <Section title="Просроченные задачи" icon={Clock} tone="text-status-yellow">
          {data.overdueTasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.stage.projectId}/stages/${task.stage.id}`}
              className="card block transition-transform active:scale-[0.99]"
            >
              <p className="font-semibold">{task.title}</p>
              <p className="mt-0.5 truncate text-sm text-text-secondary">
                {task.stage.project.name} · {task.stage.name}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {task.deadline && (
                  <span className="text-status-red">
                    до {format(new Date(task.deadline), "d MMM", { locale: ru })}
                  </span>
                )}
                {task.assignee && <span className="text-text-muted">{task.assignee.name}</span>}
              </div>
            </Link>
          ))}
        </Section>
      )}

      {data.myTasks.length > 0 && (
        <Section title="Назначено на меня" icon={ClipboardList} tone="text-accent">
          {data.myTasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.stage.projectId}/stages/${task.stage.id}`}
              className="card block transition-transform active:scale-[0.99]"
            >
              <p className="font-semibold">{task.title}</p>
              <p className="mt-0.5 truncate text-sm text-text-secondary">
                {task.stage.project.name} · {task.stage.name}
              </p>
              {task.deadline && (
                <p className="mt-1 text-sm text-text-muted">
                  до {format(new Date(task.deadline), "d MMMM", { locale: ru })}
                </p>
              )}
            </Link>
          ))}
        </Section>
      )}

      {data.upcomingVisits.length > 0 && (
        <Section title="Ближайшие выезды" icon={CalendarClock} tone="text-text-secondary">
          {data.upcomingVisits.map((visit) => (
            <Link
              key={visit.id}
              href={`/projects/${visit.projectId}`}
              className="card flex items-start gap-3 transition-transform active:scale-[0.99]"
            >
              <Truck size={20} className="mt-0.5 flex-shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{visit.crewName || "Бригада"}</p>
                <p className="truncate text-sm text-text-secondary">
                  {visit.project.name}
                  {visit.stage ? ` · ${visit.stage.name}` : ""}
                </p>
              </div>
              <span className="flex-shrink-0 text-sm text-text-muted">
                {format(new Date(visit.date), "d MMM, HH:mm", { locale: ru })}
              </span>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Hammer;
  label: string;
  value: number;
  tone: "accent" | "red" | "yellow" | "muted";
}) {
  const { text, chip } = {
    accent: { text: "text-accent", chip: "bg-accent/12 text-accent" },
    red: { text: "text-status-red", chip: "bg-status-red/12 text-status-red" },
    yellow: { text: "text-status-yellow", chip: "bg-status-yellow/12 text-status-yellow" },
    muted: { text: "text-text-primary", chip: "bg-bg-elevated text-text-secondary" }
  }[tone];

  return (
    <div className="card transition-transform duration-200 hover:-translate-y-0.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${chip}`}>
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <p className={`mt-3 text-[2rem] font-bold leading-none tabular ${text}`}>{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-text-muted">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  tone,
  children
}: {
  title: string;
  icon: typeof Hammer;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className={`mb-2 flex items-center gap-2 text-sm font-semibold ${tone}`}>
        <Icon size={16} />
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
