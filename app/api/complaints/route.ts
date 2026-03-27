import { NextRequest, NextResponse } from "next/server";

import { getSupabaseServiceClient } from "@/lib/supabaseServer";

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

export async function POST(request: NextRequest) {
  const supabase = getSupabaseServiceClient();

  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Supabase env variables are not configured." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const playerName = sanitizePlayerName(body?.playerName);
  const message = typeof body?.message === "string" ? body.message.slice(0, 1000) : "";

  const { error } = await supabase.from("chaos_complaints").insert({
    player_name: playerName,
    message,
    source: "leaderboard_slander_modal",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
