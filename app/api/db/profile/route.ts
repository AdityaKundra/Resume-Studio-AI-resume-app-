import { NextResponse } from "next/server";
import { ensureDbIndexes, getDb, isMongoConfigured } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import { tryParseUserProfile } from "@/lib/user-profile";

export async function GET() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  await ensureDbIndexes();
  const db = await getDb();
  const doc = await db.collection("profiles").findOne<{ profile: unknown }>({
    userId,
  });
  return NextResponse.json({ profile: doc?.profile ?? null });
}

export async function PUT(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = tryParseUserProfile(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  await ensureDbIndexes();
  const db = await getDb();
  await db.collection("profiles").updateOne(
    { userId },
    {
      $set: {
        userId,
        profile: parsed.profile,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  await ensureDbIndexes();
  const db = await getDb();
  await db.collection("profiles").deleteOne({ userId });
  return NextResponse.json({ ok: true });
}
