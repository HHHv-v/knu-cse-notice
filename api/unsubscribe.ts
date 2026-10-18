import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const endpoint = (req.body as { endpoint?: string } | undefined)?.endpoint;
  if (!endpoint) return res.status(400).json({ error: "endpoint가 없어요" });

  const { error } = await db.from("subscriptions").delete().eq("endpoint", endpoint);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
}
