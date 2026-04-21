import { NextResponse } from "next/server";
import { isMongoConfigured } from "@/lib/mongodb";

export async function GET() {
  return NextResponse.json({ enabled: isMongoConfigured() });
}
