import * as cheerio from "cheerio";

const BASE = "https://cse.knu.ac.kr/bbs/board.php";

// 감시할 게시판 (bo_table → 이름)
export const BOARDS = {
  sub6_1_a: "학부 공지사항",
  sub6_4: "세미나 및 행사",
  sub6_3_a: "학부인재모집",
  sub6_3_b: "취업정보",
} as const;
export type BoardId = keyof typeof BOARDS;
export const BOARD_IDS = Object.keys(BOARDS) as BoardId[];

export type Notice = {
  id: number; // 그누보드 wr_id — 게시판마다 따로 매겨짐
  board: BoardId;
  title: string;
  category: string; // 말머리 (학부 공지사항만 있음)
  posted_on: string | null; // YYYY-MM-DD
  url: string;
};

export function parseBoard(html: string, board: BoardId): Notice[] {
  const $ = cheerio.load(html);
  const byId = new Map<number, Notice>();

  $("table tr").each((_, tr) => {
    const row = $(tr);
    const link = row.find('a[href*="wr_id="]').first();
    const m = link.attr("href")?.match(/wr_id=(\d+)/);
    if (!m) return;

    const id = Number(m[1]);
    const date = row.text().match(/\d{4}-\d{2}-\d{2}/);
    byId.set(id, {
      id,
      board,
      title: link.text().replace(/\s+/g, " ").trim(),
      category: row.find('a[href*="sca="]').first().text().trim(),
      posted_on: date ? date[0] : null,
      url: `${BASE}?bo_table=${board}&wr_id=${id}`,
    });
  });

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export async function fetchBoard(board: BoardId): Promise<Notice[]> {
  const res = await fetch(`${BASE}?bo_table=${board}&lang=kor`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (KNU-CSE-notice; student project)",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${BOARDS[board]} 응답 ${res.status}`);
  return parseBoard(await res.text(), board);
}
