import type { Notice } from "./App";

// 로컬 개발(npm run dev)에서 API가 없을 때만 쓰는 예시 데이터
const u = (b: string, id: number) => `https://cse.knu.ac.kr/bbs/board.php?bo_table=${b}&wr_id=${id}`;
export const DEMO_NOTICES: Notice[] = [
  { board: "sub6_1_a", id: 29474, category: "일반공지", posted_on: "2026-10-16", url: u("sub6_1_a", 29474), title: "[SW교육원] 2026학년도 겨울계절수업 전남대학교 [인공지능기초] 교과목 학습성과 우수자 선발 프로그램 참여자 모집(10/23 금 13:00까지)" },
  { board: "sub6_3_b", id: 1978, category: "", posted_on: "2026-10-16", url: u("sub6_3_b", 1978), title: "[시사IT아카데미] 일본 IT취업 연계 K-Move 스쿨 3기 연수생 모집 안내" },
  { board: "sub6_4", id: 744, category: "", posted_on: "2026-10-16", url: u("sub6_4", 744), title: "[중심대학] 2026학년도 하반기 외부전문가 초청 SW역량특강 3차 「AI 시대, 나만의 차별화 전략」신청자 모집 안내(~10.23.)" },
  { board: "sub6_3_b", id: 1977, category: "", posted_on: "2026-10-15", url: u("sub6_3_b", 1977), title: "경북대학교 첨단정보통신융합산업기술원 연수연구원(인턴) 선발 4차 공고" },
  { board: "sub6_1_a", id: 29472, category: "일반공지", posted_on: "2026-10-14", url: u("sub6_1_a", 29472), title: "「KNU 글로벌 리더스 캠프」참가자 모집 안내" },
  { board: "sub6_1_a", id: 29471, category: "장학", posted_on: "2026-10-14", url: u("sub6_1_a", 29471), title: "2026학년도 2학기 장학사정관 장학금 장학생 선발 안내" },
  { board: "sub6_4", id: 743, category: "", posted_on: "2026-10-13", url: u("sub6_4", 743), title: "2026 동남권 멀티도메인 모빌리티 비즈니스 해커톤 참가자 모집" },
  { board: "sub6_3_a", id: 277, category: "", posted_on: "2026-09-29", url: u("sub6_3_a", 277), title: "전자공학부 운영체제 연구실 학부 연구생 모집" },
];
