"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { TopBar } from "@/components/top-bar";
import { StatusSelector } from "@/components/stage/status-selector";
import { ChatPanel } from "@/components/stage/chat-panel";
import { PhotosPanel } from "@/components/stage/photos-panel";
import { TasksPanel } from "@/components/stage/tasks-panel";
import { EstimatePanel } from "@/components/stage/estimate-panel";
import { ChecklistPanel } from "@/components/stage/checklist-panel";
import type { ProjectMemberSummary, ProjectRole, StageStatus } from "@/types/models";

type Tab = "chat" | "photos" | "tasks" | "estimate" | "checklist";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "Чат", icon: "💬" },
  { id: "photos", label: "Фото", icon: "📷" },
  { id: "tasks", label: "Задачи", icon: "✅" },
  { id: "estimate", label: "Смета", icon: "📊" },
  { id: "checklist", label: "Приёмка", icon: "✍️" }
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
        <p className="p-6 text-center text-text-secondary">Загрузка…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopBar title={stage.name} backHref={`/projects/${stage.project.id}`} />

      <StatusSelector value={stage.status} onChange={handleStatusChange} disabled={myRole === "CLIENT"} />

      <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-10 flex gap-1 overflow-x-auto border-y border-border bg-bg px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-semibold transition ${
              tab === t.id ? "bg-brand text-white" : "text-text-secondary active:bg-bg-card"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {tab === "chat" && <ChatPanel stageId={stage.id} currentUserId={session.user.id} />}
          {tab === "photos" && <PhotosPanel stageId={stage.id} />}
          {tab === "tasks" && <TasksPanel stageId={stage.id} members={members} myRole={myRole} />}
          {tab === "estimate" && <EstimatePanel stageId={stage.id} myRole={myRole} />}
          {tab === "checklist" && (
            <ChecklistPanel stageId={stage.id} myRole={myRole} currentUserName={session.user.name} />
          )}
        </div>

        {tab === "chat" && (
          <aside className="hidden border-l border-border px-4 py-4 lg:block">
            <p className="mb-3 font-semibold text-text-secondary">Задачи этапа</p>
            <TasksPanel stageId={stage.id} members={members} myRole={myRole} compact />
          </aside>
        )}
      </div>
    </div>
  );
}
