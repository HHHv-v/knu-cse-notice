import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";
import { sendPush } from "./_lib/push.js";

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { subscription } = (req.body ?? {}) as Body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) {
    return res.status(400).json({ error: "구독 정보가 올바르지 않아요" });
  }

  const { data: existing } = await db
    .from("subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();

  const row = { endpoint, p256dh, auth };
  const { error } = await db.from("subscriptions").upsert(row);
  if (error) return res.status(500).json({ error: error.message });

  // 처음 켰을 때만 확인용 알림
  if (!existing) {
    await sendPush(row, {
      title: "알림이 켜졌어요",
      body: "컴퓨터학부 공지·행사·인재모집·취업정보에 새 글이 올라오면 알려드릴게요.",
      url: "/",
      tag: "welcome",
    });
  }

  return res.json({ ok: true, created: !existing });
}
