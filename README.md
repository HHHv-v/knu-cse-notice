# 컴학 공지 알림 (knu-cse-notice)

경북대학교 컴퓨터학부 홈페이지에 새 글이 올라오면 웹 푸시로 알려주는 PWA예요.

감시하는 게시판:
- 학부 공지사항 (`sub6_1_a`)
- 세미나 및 행사 (`sub6_4`)
- 학부인재모집 (`sub6_3_a`)
- 취업정보 (`sub6_3_b`)

## 구조

```
GitHub Actions (30분마다)
   └─▶ Vercel /api/check  (서울 리전 icn1)
          ├─ 4개 게시판 1페이지 스크래핑 (게시판별 wr_id 비교)
          ├─ Supabase notices 테이블에 저장
          └─ 새 글이면 subscriptions 구독자에게 web-push 전송
브라우저(PWA)
   ├─ /api/notices      최근 공지 목록
   ├─ /api/subscribe    구독 저장 (+ 처음 켤 때 확인 알림)
   └─ /api/unsubscribe  구독 삭제
```

- 프론트: React + TypeScript + Vite, 서비스 워커(`public/sw.js`)
- 서버: Vercel Functions (`api/`), `web-push`, `cheerio`
- DB: Supabase (Postgres)

## 배포 순서 (약 20분)

### 1. Supabase
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에 `supabase/schema.sql` 붙여넣고 Run
3. Project Settings → API에서 `Project URL`, `service_role` 키 복사

### 2. VAPID 키 생성
```bash
npx web-push generate-vapid-keys
```
Public Key, Private Key 두 개가 나와요.

### 3. Vercel
1. GitHub 레포를 Vercel에 Import (Framework: Vite 자동 인식)
2. Environment Variables에 등록 (`.env.example` 참고)

| 이름 | 값 |
| --- | --- |
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 |
| `VITE_VAPID_PUBLIC_KEY` | VAPID Public Key |
| `VAPID_PRIVATE_KEY` | VAPID Private Key |
| `VAPID_SUBJECT` | `mailto:내이메일` |
| `CRON_SECRET` | 아무 긴 랜덤 문자열 |

3. Deploy

### 4. GitHub Actions
레포 Settings → Secrets and variables → Actions에 등록
- `SITE_URL` = `https://내배포주소.vercel.app` (끝에 / 없이)
- `CRON_SECRET` = Vercel에 넣은 것과 같은 값

Actions 탭 → **Check new notices** → Run workflow
- 첫 실행: 게시판마다 `"firstRun":true` → 기존 글 저장 완료 (알림은 안 감)
- 이후 실행: `"newPosts":0` 또는 `"newPosts":1,"sent":N`
- 게시판 하나가 실패해도 나머지는 계속 확인하고, `results`에 어느 게시판이 실패했는지 나와요.

### 5. 알림 켜기
배포 주소 접속 → **알림 켜기** → "알림이 켜졌어요" 확인 알림이 오면 성공
- **아이폰**: Safari 공유 → 홈 화면에 추가 → 홈 화면 앱으로 열어서 켜기 (iOS 16.4+)
- **안드로이드/PC**: 크롬·엣지·삼성 인터넷에서 바로 가능

## 실제 새 글 알림 테스트
Supabase Table Editor → `notices`에서 한 게시판의 가장 큰 id 행 하나 삭제 → Actions 수동 실행 → 그 글로 알림 도착

## 로컬 개발
```bash
npm install
npm run dev      # API 없이도 예시 공지로 화면 확인 가능
vercel dev       # API까지 로컬 실행 (Vercel CLI, .env 필요)
```

## 참고
- GitHub Actions 예약 실행은 몇 분 늦을 수 있어요. 60일간 레포 활동이 없으면 예약이 꺼지니, 꺼졌다면 Actions 탭에서 다시 켜주세요.
- 게시판을 추가·삭제하려면 `api/_lib/scrape.ts`의 `BOARDS`와 `src/App.tsx`의 `BOARD_NAME`·`BOARD_SHORT`를 함께 고쳐주세요.
- 비공식 학생 프로젝트예요. 학교 서버 부담을 줄이려고 30분 간격, 1페이지만 읽어요.
