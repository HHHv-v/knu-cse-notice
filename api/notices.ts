import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";
import { BOARD_IDS } from "./_lib/scrape.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await db
    .from("notices")
    .select("id, board, title, category, posted_on, url")
    .in("board", BOARD_IDS) // 감시를 그만둔 게시판의 예전 글은 숨김
    .order("posted_on", { ascending: false, nullsFirst: false })
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  return res.json({ notices: data });
}
