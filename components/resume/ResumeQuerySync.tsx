"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useResumeActions } from "@/hooks/useResumeActions";

let lastResumeIdParam: string | null = null;

/**
 * Reads `?resumeId=` for deep linking to a saved version (loads into workspace state).
 */
export function ResumeQuerySync() {
  const searchParams = useSearchParams();
  const { loadVersionById } = useResumeActions();

  useEffect(() => {
    const id = searchParams.get("resumeId");
    if (!id) {
      lastResumeIdParam = null;
      return;
    }
    if (id === lastResumeIdParam) return;
    lastResumeIdParam = id;
    void loadVersionById(id);
  }, [searchParams, loadVersionById]);

  return null;
}
