import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";
import { sendPush } from "./_lib/push.js";
import { BOARD_IDS } from "./_lib/scrape.js";

type Body = {
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  boards?: unknown;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { subscription, boards } = (req.body ?? {}) as Body;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (!endpoint?.startsWith("https://") || !p256dh || !auth) {
    return res.status(400).json({ error: "구독 정보가 올바르지 않아요" });
  }

  // 알 수 없는 값은 버리고, 하나도 안 남으면 전체(빈 배열)
  const picked = Array.isArray(boards)
    ? BOARD_IDS.filter((b) => (boards as unknown[]).includes(b))
    : [];

  const { data: existing } = await db
    .from("subscriptions")
    .select("endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();

  const row = { endpoint, p256dh, auth, boards: picked };
  const { error } = await db.from("subscriptions").upsert(row);
  if (error) return res.status(500).json({ error: error.message });

  // 처음 켰을 때만 확인용 알림
  if (!existing) {
    await sendPush(row, {
      title: "알림이 켜졌어요",
      body: "고른 게시판에 새 글이 올라오면 알려드릴게요.",
      url: "/",
      tag: "welcome",
    });
  }

  return res.json({ ok: true, created: !existing });
}
