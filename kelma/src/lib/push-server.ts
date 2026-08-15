import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@kelma.dev";
  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Matches the `notify*` toggles in UserSettings. A category left out of a
 * call site (there is no "category-less" push) always means the sender
 * intends every recipient to be checked against their own preference.
 */
export type PushCategory = "messages" | "tasks" | "changeOrders" | "punch" | "photos";

const CATEGORY_FIELD: Record<PushCategory, "notifyMessages" | "notifyTasks" | "notifyChangeOrders" | "notifyPunch" | "notifyPhotos"> = {
  messages: "notifyMessages",
  tasks: "notifyTasks",
  changeOrders: "notifyChangeOrders",
  punch: "notifyPunch",
  photos: "notifyPhotos"
};

async function sendToSubscription(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
) {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth }
      },
      JSON.stringify(payload)
    );
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    // 404/410 means the browser dropped the subscription — stop tracking it.
    if (statusCode === 404 || statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
    } else {
      console.error("Push send failed", err);
    }
  }
}

/**
 * Drops users who explicitly turned this category off. A user with no
 * UserSettings row (never opened the settings screen) is treated as still on
 * every default — new users keep getting notified until they choose not to.
 */
async function filterByPreference(userIds: string[], category: PushCategory): Promise<string[]> {
  if (userIds.length === 0) return [];
  const field = CATEGORY_FIELD[category];

  const rows = await prisma.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      notifyMessages: true,
      notifyTasks: true,
      notifyChangeOrders: true,
      notifyPunch: true,
      notifyPhotos: true
    }
  });

  const optedOut = new Set(rows.filter((r) => r[field] === false).map((r) => r.userId));
  return userIds.filter((id) => !optedOut.has(id));
}

/** Push to every user in the list except `excludeUserId` (typically the actor who triggered the event). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  excludeUserId: string | undefined,
  category: PushCategory
) {
  if (!ensureConfigured()) return;
  const withoutActor = userIds.filter((id) => id !== excludeUserId);
  const targets = await filterByPreference(withoutActor, category);
  if (targets.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: targets } }
  });

  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToProjectMembers(
  projectId: string,
  payload: PushPayload,
  excludeUserId: string | undefined,
  category: PushCategory
) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  });
  await sendPushToUsers(members.map((m) => m.userId), payload, excludeUserId, category);
}
