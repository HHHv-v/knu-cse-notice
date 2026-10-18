import webpush from "web-push";
import { db } from "./db.js";

let vapidReady = false;
function ensureVapid() {
  if (vapidReady) return;
  const pub = process.env.VITE_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("환경변수 VITE_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY가 없어요");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  vapidReady = true;
}

export type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** 보내고, 만료된 구독(404/410)은 정리. 성공하면 true */
export async function sendPush(sub: SubscriptionRow, payload: PushPayload): Promise<boolean> {
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db.from("subscriptions").delete().eq("endpoint", sub.endpoint);
    } else {
      console.error("push 실패", status, err);
    }
    return false;
  }
}
