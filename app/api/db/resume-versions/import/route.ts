import { NextResponse } from "next/server";
import { ensureDbIndexes, getDb, isMongoConfigured } from "@/lib/mongodb";
import { getSessionUserId } from "@/lib/server-session";
import type { SavedResumeVersion } from "@/lib/types";

const MAX_VERSIONS = 40;

function isValidSavedVersion(v: unknown): v is SavedResumeVersion {
  return (
    v != null &&
    typeof v === "object" &&
    typeof (v as SavedResumeVersion).id === "string" &&
    typeof (v as SavedResumeVersion).timestamp === "number" &&
    (v as SavedResumeVersion).resumeData != null
  );
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
  const mode = o.mode === "replace" ? "replace" : "merge";
  let rawList: unknown[] | null = null;
  if (Array.isArray(body)) {
    rawList = body;
  } else if (body && typeof body === "object" && Array.isArray(o.versions)) {
    rawList = o.versions;
  }
  if (!rawList) {
    return NextResponse.json(
      { error: "Expected versions array or { versions: [] }" },
      { status: 400 }
    );
  }

  const versions = rawList.filter(isValidSavedVersion);
  if (versions.length === 0) {
    return NextResponse.json(
      { error: "No valid resume versions found in payload." },
      { status: 400 }
    );
  }

  await ensureDbIndexes();
  const db = await getDb();
  const col = db.collection("resume_versions");

  if (mode === "replace") {
    await col.deleteMany({ userId });
    const slice = versions.slice(0, MAX_VERSIONS);
    for (const v of slice) {
      await col.replaceOne(
        { userId, versionId: v.id },
        {
          userId,
          versionId: v.id,
          timestamp: v.timestamp,
          jobTitle: v.jobTitle,
          resumeData: v.resumeData,
          atsScore: v.atsScore,
          advancedAts: v.advancedAts,
          jobDescription: v.jobDescription,
          updatedAt: new Date(),
        },
        { upsert: true }
      );
    }
    return NextResponse.json({ ok: true, count: slice.length });
  }

  const existing = await col
    .find({ userId })
    .sort({ timestamp: -1 })
    .limit(MAX_VERSIONS * 2)
    .toArray();
  const byId = new Map<string, SavedResumeVersion>();
  for (const v of existing) {
    const sv: SavedResumeVersion = {
      id: v.versionId as string,
      timestamp: v.timestamp as number,
      jobTitle: v.jobTitle as string,
      resumeData: v.resumeData as SavedResumeVersion["resumeData"],
      atsScore: v.atsScore as number,
      advancedAts: v.advancedAts as SavedResumeVersion["advancedAts"],
      jobDescription: v.jobDescription as string | undefined,
    };
    byId.set(sv.id, sv);
  }
  for (const v of versions) {
    const cur = byId.get(v.id);
    if (!cur || v.timestamp >= cur.timestamp) byId.set(v.id, v);
  }
  const merged = [...byId.values()]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_VERSIONS);
  await col.deleteMany({ userId });
  for (const v of merged) {
    await col.replaceOne(
      { userId, versionId: v.id },
      {
        userId,
        versionId: v.id,
        timestamp: v.timestamp,
        jobTitle: v.jobTitle,
        resumeData: v.resumeData,
        atsScore: v.atsScore,
        advancedAts: v.advancedAts,
        jobDescription: v.jobDescription,
        updatedAt: new Date(),
      },
      { upsert: true }
    );
  }
  return NextResponse.json({ ok: true, count: versions.length });
}
