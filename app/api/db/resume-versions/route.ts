import { NextResponse } from "next/server";
import { ensureDbIndexes, getDb, isMongoConfigured } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import type { AdvancedATSResult, OptimizedResume, SavedResumeVersion } from "@/lib/types";

type VersionDoc = {
  userId: string;
  versionId: string;
  timestamp: number;
  jobTitle: string;
  resumeData: OptimizedResume;
  atsScore: number;
  advancedAts?: AdvancedATSResult;
  jobDescription?: string;
};

function toSavedVersion(doc: VersionDoc): SavedResumeVersion {
  return {
    id: doc.versionId,
    timestamp: doc.timestamp,
    jobTitle: doc.jobTitle,
    resumeData: doc.resumeData,
    atsScore: doc.atsScore,
    advancedAts: doc.advancedAts,
    jobDescription: doc.jobDescription,
  };
}

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
  const cursor = db
    .collection<VersionDoc>("resume_versions")
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(40);
  const docs = await cursor.toArray();
  return NextResponse.json({ versions: docs.map(toSavedVersion) });
}

export async function POST(request: Request) {
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
  const versionId =
    typeof o.id === "string" && o.id.length > 0 ? o.id : crypto.randomUUID();
  const timestamp =
    typeof o.timestamp === "number" && Number.isFinite(o.timestamp)
      ? o.timestamp
      : Date.now();
  const jobTitle = typeof o.jobTitle === "string" ? o.jobTitle : "Untitled";
  const resumeData = o.resumeData as OptimizedResume | undefined;
  if (!resumeData || typeof resumeData !== "object") {
    return NextResponse.json({ error: "resumeData is required" }, { status: 400 });
  }
  const atsScore =
    typeof o.atsScore === "number" && Number.isFinite(o.atsScore) ? o.atsScore : 0;
  const advancedAts = o.advancedAts as AdvancedATSResult | undefined;
  const jobDescription =
    typeof o.jobDescription === "string" ? o.jobDescription : undefined;

  await ensureDbIndexes();
  const db = await getDb();
  const doc: VersionDoc = {
    userId,
    versionId,
    timestamp,
    jobTitle,
    resumeData,
    atsScore,
    advancedAts,
    jobDescription,
  };
  await db.collection("resume_versions").replaceOne(
    { userId, versionId },
    { ...doc, updatedAt: new Date() },
    { upsert: true }
  );
  const count = await db.collection("resume_versions").countDocuments({ userId });
  if (count > 40) {
    const extras = await db
      .collection<VersionDoc>("resume_versions")
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(40)
      .toArray();
    for (const e of extras) {
      await db.collection("resume_versions").deleteOne({
        userId,
        versionId: e.versionId,
      });
    }
  }
  return NextResponse.json({ version: toSavedVersion(doc) });
}

export async function DELETE(request: Request) {
  if (!isMongoConfigured()) {
    return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
  }
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";
  await ensureDbIndexes();
  const db = await getDb();
  if (all) {
    await db.collection("resume_versions").deleteMany({ userId });
    return NextResponse.json({ ok: true });
  }
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id or all=1" }, { status: 400 });
  }
  await db.collection("resume_versions").deleteOne({ userId, versionId: id });
  return NextResponse.json({ ok: true });
}
