import * as cheerio from "cheerio";

const BASE = "https://cse.knu.ac.kr/bbs/board.php";

// 감시할 게시판 (bo_table → 이름)
export const BOARDS = {
  sub6_1_a: "학부 공지사항",
  sub6_4: "세미나 및 행사",
  sub6_3_a: "학부인재모집",
  sub6_3_b: "취업정보",
  intl: "국제처 공지사항",
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
    // 작성일은 항상 마지막 칸 — 세미나 게시판처럼 행사일 칸이 앞에 있어도 마지막 날짜를 씀
    const dates = row.text().match(/\d{4}-\d{2}-\d{2}/g);
    byId.set(id, {
      id,
      board,
      title: link.text().replace(/\s+/g, " ").trim(),
      category: row.find('a[href*="sca="]').first().text().trim(),
      posted_on: dates ? dates[dates.length - 1] : null,
      url: `${BASE}?bo_table=${board}&wr_id=${id}`,
    });
  });

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// ── 국제처 (international.knu.ac.kr) — 그누보드가 아닌 별도 CMS ──────────────
const INTL_BASE = "https://international.knu.ac.kr";
const INTL_LIST = `${INTL_BASE}/HOME/global/sub.htm?nav_code=glo1729572883`; // 공지사항(국제화 프로그램)

/** 글 링크의 mv_data(base64)를 풀어 idx(글 고유번호)를 꺼냄 */
function intlIdx(href: string): number | null {
  const raw = new URL(href, INTL_BASE).searchParams.get("mv_data");
  if (!raw) return null;
  for (const v of [raw, safeDecode(raw)]) {
    const m = Buffer.from(v, "base64").toString("utf8").match(/(?:^|&)idx=(\d+)/);
    if (m) return Number(m[1]);
  }
  return null;
}
function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export function parseIntl(html: string): Notice[] {
  const $ = cheerio.load(html);
  const byId = new Map<number, Notice>();
  $("table tbody tr").each((_, tr) => {
    const row = $(tr);
    const link = row.find("a[href*='mv_data']").first();
    const href = link.attr("href");
    if (!href) return;
    const id = intlIdx(href);
    if (id === null) return;
    const dates = row.text().match(/\d{4}[/.-]\d{2}[/.-]\d{2}/g);
    byId.set(id, {
      id,
      board: "intl",
      title: link.text().replace(/\s+/g, " ").trim(),
      category: "",
      posted_on: dates ? dates[dates.length - 1].replace(/[/.]/g, "-") : null,
      url: new URL(href, INTL_BASE).toString(),
    });
  });
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

export async function fetchBoard(board: BoardId): Promise<Notice[]> {
  if (board === "intl") {
    const res = await fetch(INTL_LIST, {
      headers: { "User-Agent": "Mozilla/5.0 (KNU-CSE-notice; student project)", "Accept-Language": "ko-KR,ko;q=0.9" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`${BOARDS[board]} 응답 ${res.status}`);
    return parseIntl(await res.text());
  }

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
