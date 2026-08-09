export type ProjectRole = "ADMIN" | "WORKER" | "CLIENT";
export type ProjectStatus = "ACTIVE" | "PAUSED" | "DONE" | "CANCELLED";
export type StageStatus = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "PROBLEM";
export type MessageType = "TEXT" | "PHOTO" | "FILE" | "SYSTEM";
export type PhotoTag = "BEFORE" | "AFTER" | "PROBLEM" | "CHECKED";
export type TaskStatus = "NEW" | "IN_PROGRESS" | "REVIEW" | "DONE";

export interface UserSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string | null;
}

export interface StageSummary {
  id: string;
  projectId: string;
  name: string;
  order: number;
  status: StageStatus;
}

export interface ProjectMemberSummary {
  id: string;
  role: ProjectRole;
  userId: string;
  user?: UserSummary;
}

export interface ProjectSummary {
  id: string;
  name: string;
  address: string;
  status: ProjectStatus;
  updatedAt: string;
  stages: StageSummary[];
  members: ProjectMemberSummary[];
}

export interface VisitSummary {
  id: string;
  date: string;
  crewName?: string | null;
  note?: string | null;
  stage?: { id: string; name: string } | null;
}

export interface MessageSummary {
  id: string;
  stageId: string;
  content: string;
  type: MessageType;
  fileUrl?: string | null;
  createdAt: string;
  sender: UserSummary;
}

export interface PhotoSummary {
  id: string;
  stageId: string;
  url: string;
  tag: PhotoTag;
  description?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  createdAt: string;
  uploadedBy: UserSummary;
}

export interface TaskSummary {
  id: string;
  stageId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  deadline?: string | null;
  assignee?: UserSummary | null;
  creator: UserSummary;
}

export interface EstimateItem {
  id: string;
  stageId: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstimateHistoryEntry {
  id: string;
  action: "created" | "updated" | "deleted";
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  changedAt: string;
  changedBy: UserSummary;
}

export interface ChecklistItemSummary {
  id: string;
  stageId: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface SignatureSummary {
  id: string;
  signerName: string;
  imageData: string;
  createdAt: string;
}

export type PinStatus = "OPEN" | "RESOLVED";

export interface PlanSummary {
  id: string;
  projectId: string;
  name: string;
  url: string;
  createdAt: string;
  _count?: { pins: number };
}

export interface PlanPinSummary {
  id: string;
  planId: string;
  x: number;
  y: number;
  title: string;
  description?: string | null;
  status: PinStatus;
  createdAt: string;
  createdBy: UserSummary;
  stage?: { id: string; name: string } | null;
  photo?: { id: string; url: string } | null;
}
