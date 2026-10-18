-- Supabase 대시보드 → SQL Editor에 붙여넣고 Run

create table if not exists notices (
  board      text   not null,             -- 게시판 bo_table (sub6_1_a 등)
  id         bigint not null,             -- 게시판 안의 wr_id (게시판마다 따로 매겨짐)
  title      text   not null,
  category   text   not null default '',
  posted_on  date,
  url        text   not null,
  first_seen timestamptz not null default now(),
  primary key (board, id)
);
create index if not exists notices_recent on notices (posted_on desc, first_seen desc);

create table if not exists subscriptions (
  endpoint   text primary key,
  p256dh     text not null,
  auth       text not null,
  boards     text[] not null default '{}',  -- 받을 게시판 (비어 있으면 전체)
  created_at timestamptz not null default now()
);

-- 브라우저(anon 키)에서는 아무것도 못 읽고 쓰게 잠금.
-- 서버는 service_role 키로 접근하므로 RLS 영향 없음.
alter table notices       enable row level security;
alter table subscriptions enable row level security;

-- 'Automatically expose new tables'를 끈 프로젝트에서도 서버(service_role)가 접근할 수 있게
grant select, insert, update, delete on notices, subscriptions to service_role;

-- 이미 만든 프로젝트에 게시판 선택 기능을 추가할 때
alter table subscriptions add column if not exists boards text[] not null default '{}';
