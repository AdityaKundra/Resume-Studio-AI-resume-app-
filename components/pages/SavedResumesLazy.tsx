"use client";

import dynamic from "next/dynamic";

export const SavedResumesLazy = dynamic(
  () =>
    import("./SavedResumesPageView").then((m) => m.SavedResumesPageView),
  {
    loading: () => (
      <p className="rounded-ca bg-ca-low px-4 py-12 text-center text-sm text-ca-muted">
        Loading saved resumes…
      </p>
    ),
    ssr: false,
  }
);
