import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let configured = false;

function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:support@budchat.dev";
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

/** Push to every user in the list except `excludeUserId` (typically the actor who triggered the event). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload, excludeUserId?: string) {
  if (!ensureConfigured()) return;
  const targets = userIds.filter((id) => id !== excludeUserId);
  if (targets.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: targets } }
  });

  await Promise.all(subscriptions.map((sub) => sendToSubscription(sub, payload)));
}

export async function sendPushToProjectMembers(projectId: string, payload: PushPayload, excludeUserId?: string) {
  const members = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true }
  });
  await sendPushToUsers(members.map((m) => m.userId), payload, excludeUserId);
}
