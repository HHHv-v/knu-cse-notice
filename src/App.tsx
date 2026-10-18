import { useEffect, useMemo, useState } from "react";
import { checkSupport, currentSubscription, subscribe, unsubscribe, type Support } from "./push";
import { DEMO_NOTICES } from "./demo";

export type BoardId = "sub6_1_a" | "sub6_4" | "sub6_3_a" | "sub6_3_b";
export type Notice = {
  id: number;
  board: BoardId;
  title: string;
  category: string;
  posted_on: string | null;
  url: string;
};

const BOARD_NAME: Record<BoardId, string> = {
  sub6_1_a: "학부 공지사항",
  sub6_4: "세미나 및 행사",
  sub6_3_a: "학부인재모집",
  sub6_3_b: "취업정보",
};
// 목록 왼쪽 칸용 짧은 이름
const BOARD_SHORT: Record<BoardId, string> = {
  sub6_1_a: "학부공지",
  sub6_4: "세미나",
  sub6_3_a: "인재모집",
  sub6_3_b: "취업정보",
};

const ALL_BOARDS = Object.keys(BOARD_NAME) as BoardId[];
const STORE_KEY = "knu-cse-notice:boards";
function loadBoards(): BoardId[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (Array.isArray(v)) {
      const ok = v.filter((b): b is BoardId => ALL_BOARDS.includes(b));
      if (ok.length) return ok;
    }
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return ALL_BOARDS;
}
function saveBoards(b: BoardId[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(b));
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
}
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function dayLabel(iso: string | null): string {
  if (!iso) return "날짜 없음";
  const d = new Date(`${iso}T00:00:00+09:00`);
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }) + "T00:00:00+09:00");
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
  if (diff === 0) return `오늘, ${base}`;
  if (diff === 1) return `어제, ${base}`;
  return base;
}

export default function App() {
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [support, setSupport] = useState<Support>("ok");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [boards, setBoards] = useState<BoardId[]>(loadBoards);
  const [savedBoards, setSavedBoards] = useState<BoardId[]>(loadBoards);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setNotices(d.notices))
      .catch(() => {
        if (import.meta.env.DEV) setNotices(DEMO_NOTICES);
        else setLoadError(true);
      });

    const s = checkSupport();
    setSupport(s);
    if (s === "ok") {
      currentSubscription()
        .then((sub) => setSubscribed(!!sub && Notification.permission === "granted"))
        .catch(() => setSubscribed(false));
    } else {
      setSubscribed(false);
    }
  }, []);

  const toggleBoard = (b: BoardId) =>
    setBoards((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : ALL_BOARDS.filter((x) => prev.includes(x) || x === b)));

  async function handleSubscribe() {
    setBusy(true);
    setStatus(null);
    try {
      await subscribe(boards);
      saveBoards(boards);
      setSavedBoards(boards);
      const wasOn = subscribed;
      setSubscribed(true);
      setStatus({ tone: "ok", text: wasOn ? "받을 게시판을 저장했어요." : "알림을 켰어요. 확인 알림이 곧 도착해요." });
    } catch (e) {
      const msg = (e as Error).message;
      setStatus({
        tone: "error",
        text:
          msg === "permission-denied"
            ? "알림 권한이 차단되어 있어요. 브라우저 주소창의 사이트 설정에서 알림을 허용한 뒤 다시 눌러주세요."
            : `알림을 켜지 못했어요: ${msg}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setBusy(true);
    setStatus(null);
    try {
      await unsubscribe();
      setSubscribed(false);
      setStatus({ tone: "ok", text: "알림을 껐어요." });
    } catch (e) {
      setStatus({ tone: "error", text: `알림을 끄지 못했어요: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  const dirty = !!subscribed && !sameSet(boards, savedBoards);
  const latest = notices?.[0];
  const groups = useMemo(() => {
    const map = new Map<string, Notice[]>();
    for (const n of notices?.slice(1) ?? []) {
      const key = n.posted_on ?? "";
      map.set(key, [...(map.get(key) ?? []), n]);
    }
    return [...map.entries()];
  }, [notices]);

  return (
    <div className="page">
      <header className="masthead">
        <span className="mark" aria-hidden="true" />
        <span>경북대 컴퓨터학부 공지 알림</span>
      </header>

      <main>
        <section className="board" aria-label="가장 최근 공지">
          <p className="board-caption">가장 최근에 올라온 글</p>
          {latest ? (
            <a className="slip" href={latest.url} target="_blank" rel="noreferrer">
              <span className="pin" aria-hidden="true" />
              <span className="slip-cat">
                {BOARD_NAME[latest.board]}
                {latest.category && <span className="slip-sub">{latest.category}</span>}
              </span>
              <span className="slip-title">{latest.title}</span>
              <span className="slip-date">{dayLabel(latest.posted_on)}</span>
            </a>
          ) : (
            <div className="slip slip-empty">
              {loadError ? "공지를 불러오지 못했어요. 잠시 후 새로고침해 주세요." : "공지를 불러오는 중이에요"}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="alert-heading">
          <h1 id="alert-heading">
            {subscribed ? "새 공지가 올라오면 알려드릴게요" : "새 공지, 게시판보다 먼저 알기"}
          </h1>
          <p className="lede">
            고른 게시판을 30분마다 확인해서 새 글이 올라오면 이 기기로 알려드려요.
          </p>

          {support === "ios-install" ? (
            <div className="ios-guide">
              <p className="ios-title">아이폰은 홈 화면에 추가해야 알림을 받을 수 있어요</p>
              <ol>
                <li>Safari 아래쪽 공유 버튼을 눌러요.</li>
                <li>‘홈 화면에 추가’를 눌러요.</li>
                <li>홈 화면에 생긴 ‘컴학 공지’로 다시 열어 알림을 켜요.</li>
              </ol>
              <p className="hint">iOS 16.4 이상에서 동작해요.</p>
            </div>
          ) : support === "unsupported" ? (
            <p className="status error">
              이 브라우저는 푸시 알림을 지원하지 않아요. 크롬, 엣지, 삼성 인터넷이나 최신 사파리에서 열어주세요.
            </p>
          ) : (
            <>
              <fieldset className="cats">
                <legend>알림 받을 게시판</legend>
                <div className="chips">
                  {ALL_BOARDS.map((b) => {
                    const on = boards.includes(b);
                    return (
                      <button
                        key={b}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        disabled={on && boards.length === 1}
                        title={on && boards.length === 1 ? "게시판을 하나 이상 골라야 해요" : undefined}
                        onClick={() => toggleBoard(b)}
                      >
                        {BOARD_NAME[b]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="actions">
                {!subscribed ? (
                  <button className="primary" onClick={handleSubscribe} disabled={busy || subscribed === null}>
                    {busy ? "켜는 중…" : "알림 켜기"}
                  </button>
                ) : (
                  <>
                    <button className="primary" onClick={handleSubscribe} disabled={busy || !dirty}>
                      {busy ? "저장 중…" : dirty ? "설정 저장" : "알림 켜짐"}
                    </button>
                    <button className="quiet" onClick={handleUnsubscribe} disabled={busy}>
                      알림 끄기
                    </button>
                  </>
                )}
              </div>
            </>
          )}

          {status && (
            <p className={`status ${status.tone}`} role="status">
              {status.text}
            </p>
          )}
        </section>

        {groups.length > 0 && (
          <section className="feed" aria-label="최근 공지">
            {groups.map(([day, items]) => (
              <div key={day} className="day">
                <h2>{dayLabel(day || null)}</h2>
                <ul>
                  {items.map((n) => (
                    <li key={`${n.board}-${n.id}`}>
                      <a href={n.url} target="_blank" rel="noreferrer">
                        <span className="cat">{BOARD_SHORT[n.board]}</span>
                        <span className="title">
                          {n.category && <span className="tag">[{n.category}] </span>}
                          {n.title}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>

      <footer className="foot">
        학생이 만든 비공식 서비스예요. 원문은{" "}
        <a href="https://cse.knu.ac.kr/bbs/board.php?bo_table=sub6_1_a&lang=kor" target="_blank" rel="noreferrer">
          컴퓨터학부 홈페이지
        </a>
        에서 확인해 주세요.
      </footer>
    </div>
  );
}
