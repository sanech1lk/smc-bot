"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BarChart3, Camera, CheckSquare, ListChecks, MessageCircle } from "lucide-react";
import { TopBar } from "@/components/top-bar";
import { StatusSelector } from "@/components/stage/status-selector";
import { ChatPanel } from "@/components/stage/chat-panel";
import { PhotosPanel } from "@/components/stage/photos-panel";
import { TasksPanel } from "@/components/stage/tasks-panel";
import { EstimatePanel } from "@/components/stage/estimate-panel";
import { ChecklistPanel } from "@/components/stage/checklist-panel";
import { SkeletonList } from "@/components/ui";
import type { ProjectMemberSummary, ProjectRole, StageStatus } from "@/types/models";

type Tab = "chat" | "photos" | "tasks" | "estimate" | "checklist";

const TABS: { id: Tab; label: string; icon: typeof MessageCircle }[] = [
  { id: "chat", label: "Чат", icon: MessageCircle },
  { id: "photos", label: "Фото", icon: Camera },
  { id: "tasks", label: "Задачи", icon: CheckSquare },
  { id: "estimate", label: "Смета", icon: BarChart3 },
  { id: "checklist", label: "Приёмка", icon: ListChecks }
];

interface StageDetail {
  id: string;
  name: string;
  status: StageStatus;
  project: { id: string; name: string };
}

export default function StagePage() {
  const params = useParams<{ id: string; stageId: string }>();
  const { data: session } = useSession();
  const [stage, setStage] = useState<StageDetail | null>(null);
  const [myRole, setMyRole] = useState<ProjectRole>("WORKER");
  const [members, setMembers] = useState<ProjectMemberSummary[]>([]);
  const [tab, setTab] = useState<Tab>("chat");

  const loadStage = useCallback(async () => {
    const res = await fetch(`/api/stages/${params.stageId}`);
    if (res.ok) {
      const data = await res.json();
      setStage(data.stage);
      setMyRole(data.myRole);
    }
  }, [params.stageId]);

  useEffect(() => {
    loadStage();
  }, [loadStage]);

  useEffect(() => {
    if (!stage) return;
    (async () => {
      const res = await fetch(`/api/projects/${stage.project.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    })();
  }, [stage]);

  async function handleStatusChange(status: StageStatus) {
    if (!stage) return;
    setStage({ ...stage, status });
    await fetch(`/api/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  }

  if (!stage || !session?.user) {
    return (
      <div>
        <TopBar title="Этап" backHref={`/projects/${params.id}`} />
        <div className="px-4 py-4">
          <SkeletonList rows={4} height="h-16" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title={stage.name} subtitle={stage.project.name} backHref={`/projects/${stage.project.id}`} />

      <StatusSelector value={stage.status} onChange={handleStatusChange} disabled={myRole === "CLIENT"} />

      <div className="lg:grid lg:flex-1 lg:grid-cols-[1fr_340px]">
        {/* Each panel adds its own bottom clearance for the fixed nav. */}
        <div key={tab} className="animate-in min-w-0">
          {tab === "chat" && <ChatPanel stageId={stage.id} currentUserId={session.user.id} />}
          {tab === "photos" && <PhotosPanel stageId={stage.id} />}
          {tab === "tasks" && <TasksPanel stageId={stage.id} members={members} myRole={myRole} />}
          {tab === "estimate" && (
            <EstimatePanel stageId={stage.id} stageName={stage.name} myRole={myRole} />
          )}
          {tab === "checklist" && (
            <ChecklistPanel stageId={stage.id} myRole={myRole} currentUserName={session.user.name} />
          )}
        </div>

        {tab === "chat" && (
          <aside className="hidden border-l border-border px-4 py-4 lg:block">
            <p className="label mb-3">Задачи этапа</p>
            <TasksPanel stageId={stage.id} members={members} myRole={myRole} compact />
          </aside>
        )}
      </div>

      {/* Fixed bottom tab bar: five targets fit without horizontal scrolling. */}
      <nav className="bottom-nav-safe fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md lg:hidden">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                  active ? "text-brand" : "text-text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
                <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop keeps a horizontal tab row instead of the bottom bar. */}
      <div className="fixed bottom-0 left-0 right-0 z-30 hidden border-t border-border bg-bg/90 px-4 py-2 backdrop-blur-md lg:flex lg:gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              tab === id ? "bg-brand text-white" : "text-text-secondary hover:bg-bg-elevated"
            }`}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
