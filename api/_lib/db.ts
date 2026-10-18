import { createClient } from "@supabase/supabase-js";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`환경변수 ${name}가 없어요`);
  return v;
}

// 서버 전용 키(service role) — 브라우저로 절대 내보내지 않음
export const db = createClient(
  required("SUPABASE_URL"),
  required("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } },
);
