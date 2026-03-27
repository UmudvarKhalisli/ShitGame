import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type LeaderboardRow = {
  id: string;
  player_name: string;
  patience_level: number;
  attempts: number;
  total_time_seconds: number;
  created_at: string;
};

function sanitizePlayerName(value: unknown) {
  if (typeof value !== "string") {
    return "Anonim";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "Anonim";
  }

  return trimmed.slice(0, 40);
}

export async function GET() {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: true, rows: [] });
  }

  const { data, error } = await supabase
    .from("chaos_leaderboard")
    .select("id, player_name, patience_level, attempts, total_time_seconds, created_at")
    .order("patience_level", { ascending: false })
    .order("attempts", { ascending: true })
    .order("total_time_seconds", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: (data ?? []) as LeaderboardRow[] });
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase env variables are not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const playerName = sanitizePlayerName(body?.playerName);
  const attempts = Number.isFinite(Number(body?.attempts)) ? Math.max(0, Math.floor(Number(body.attempts))) : 0;
  const totalTimeSeconds = Number.isFinite(Number(body?.totalTimeSeconds))
    ? Math.max(0, Math.floor(Number(body.totalTimeSeconds)))
    : 0;
  const patienceLevel = Number.isFinite(Number(body?.patienceLevel))
    ? Math.max(0, Math.floor(Number(body.patienceLevel)))
    : 0;

  const { error } = await supabase.from("chaos_leaderboard").insert({
    player_name: playerName,
    patience_level: patienceLevel,
    attempts,
    total_time_seconds: totalTimeSeconds,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
