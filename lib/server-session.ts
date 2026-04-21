import { cookies } from "next/headers";
import { RESUME_SESSION_COOKIE } from "@/lib/session-constants";

export async function getSessionUserId(): Promise<string | null> {
  const c = await cookies();
  return c.get(RESUME_SESSION_COOKIE)?.value ?? null;
}
