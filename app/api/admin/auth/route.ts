import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync } from "fs";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { join } from "path";

const COOKIE_NAME = "stage_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;

function readAdminBypassFromExample() {
  try {
    const envExample = readFileSync(join(process.cwd(), ".env.example"), "utf8");
    const match = envExample.match(/^\s*ADMIN_BYPASS_KEY\s*=\s*(.+)\s*$/m);
    if (!match) {
      return undefined;
    }

    return match[1].trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

function getAdminSecret() {
  const fromEnv = process.env.ADMIN_BYPASS_KEY?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV !== "production") {
    return readAdminBypassFromExample();
  }

  return undefined;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function buildToken(expiresAt: number, secret: string) {
  const payload = String(expiresAt);
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

function isValidToken(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const expectedSignature = signPayload(payload, secret);

  const provided = Buffer.from(signature, "utf8");
  const expected = Buffer.from(expectedSignature, "utf8");

  if (provided.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(provided, expected);
}

export async function POST(request: NextRequest) {
  const adminSecret = getAdminSecret();

  if (!adminSecret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_BYPASS_KEY is not configured." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const key = typeof body?.key === "string" ? body.key.trim() : "";

  if (!key || key !== adminSecret) {
    return NextResponse.json({ ok: false, error: "Invalid key." }, { status: 401 });
  }

  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = buildToken(expiresAt, adminSecret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return response;
}

export async function GET() {
  const adminSecret = getAdminSecret();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  const ok = isValidToken(token, adminSecret);
  return NextResponse.json({ ok });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
