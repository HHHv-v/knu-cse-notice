import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const { data, error } = await db
    .from("notices")
    .select("id, board, title, category, posted_on, url")
    .order("posted_on", { ascending: false, nullsFirst: false })
    .order("first_seen", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.json({ notices: data });
}
