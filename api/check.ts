import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/db.js";
import { BOARDS, BOARD_IDS, fetchBoard, type BoardId, type Notice } from "./_lib/scrape.js";
import { sendPush, type SubscriptionRow } from "./_lib/push.js";

type BoardResult = { board: BoardId; firstRun?: boolean; newPosts?: number; error?: string };

/** 게시판 하나: 저장하고, 이번에 처음 본 글 목록을 돌려줌 */
async function syncBoard(board: BoardId): Promise<{ result: BoardResult; fresh: Notice[] }> {
  const posts = await fetchBoard(board);
  if (!posts.length) {
    return { result: { board, error: "글을 찾지 못함 (사이트 구조 변경?)" }, fresh: [] };
  }

  const { data: last, error: lastErr } = await db
    .from("notices")
    .select("id")
    .eq("board", board)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr) throw lastErr;

  // 제목 수정 반영을 위해 1페이지 전체 upsert
  const { error } = await db.from("notices").upsert(posts, { onConflict: "board,id" });
  if (error) throw error;

  // 첫 실행: 기존 글로 알림 폭탄이 가지 않게 저장만
  if (!last) return { result: { board, firstRun: true }, fresh: [] };

  const fresh = posts.filter((p) => p.id > last.id);
  return { result: { board, newPosts: fresh.length }, fresh };
}

/**
 * 30분마다 GitHub Actions가 호출.
 * 4개 게시판을 읽어 새 글(게시판별로 더 큰 wr_id)이 있으면 구독자에게 푸시.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const settled = await Promise.allSettled(BOARD_IDS.map(syncBoard));
  const results: BoardResult[] = [];
  const fresh: Notice[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") {
      results.push(s.value.result);
      fresh.push(...s.value.fresh);
    } else {
      console.error(BOARD_IDS[i], s.reason);
      results.push({ board: BOARD_IDS[i], error: String(s.reason) });
    }
  });

  let sent = 0;
  if (fresh.length) {
    const { data: subs, error } = await db.from("subscriptions").select("endpoint, p256dh, auth, boards");
    if (error) return res.status(500).json({ error: error.message, results });

    for (const post of fresh) {
      const ok = await Promise.all(
        (subs as SubscriptionRow[])
          .filter((s) => !s.boards?.length || s.boards.includes(post.board))
          .map((s) =>
          sendPush(s, {
            title: `${BOARDS[post.board]} 새 글`,
            body: post.category ? `[${post.category}] ${post.title}` : post.title,
            url: post.url,
            tag: `${post.board}-${post.id}`,
          }),
        ),
      );
      sent += ok.filter(Boolean).length;
    }
  }

  const allFailed = results.every((r) => r.error);
  return res.status(allFailed ? 502 : 200).json({ newPosts: fresh.length, sent, results });
}
