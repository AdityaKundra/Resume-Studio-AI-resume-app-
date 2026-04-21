import { NextResponse } from "next/server";
import { ensureDbIndexes, getDb, isMongoConfigured } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import type { InterviewPrepResponse } from "@/lib/types";

type PrepDoc = {
  userId: string;
  sourceSig: string;
  prep: InterviewPrepResponse;
  updatedAt: Date;
};

export async function GET(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const sig = new URL(request.url).searchParams.get("sig");
  if (!sig || sig.length < 16) {
    return NextResponse.json({ error: "sig query required" }, { status: 400 });
  }
  await ensureDbIndexes();
  const db = await getDb();
  const doc = await db.collection<PrepDoc>("interview_prep").findOne({
    userId,
    sourceSig: sig,
  });
  if (!doc?.prep) {
    return NextResponse.json({ prep: null });
  }
  return NextResponse.json({ prep: doc.prep });
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
  const o = body as Record<string, unknown>;
  const sourceSig = typeof o.sourceSig === "string" ? o.sourceSig : "";
  const prep = o.prep as InterviewPrepResponse | undefined;
  if (!sourceSig || sourceSig.length < 16) {
    return NextResponse.json({ error: "sourceSig is required" }, { status: 400 });
  }
  if (!prep || typeof prep !== "object" || !("role" in prep)) {
    return NextResponse.json({ error: "prep is required" }, { status: 400 });
  }
  await ensureDbIndexes();
  const db = await getDb();
  await db.collection("interview_prep").replaceOne(
    { userId, sourceSig },
    {
      userId,
      sourceSig,
      prep,
      updatedAt: new Date(),
    },
    { upsert: true }
  );
  return NextResponse.json({ ok: true });
}
