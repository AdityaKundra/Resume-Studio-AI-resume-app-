"use client";

import dynamic from "next/dynamic";

export const ResumeBuilderLazy = dynamic(
  () =>
    import("./ResumeBuilderView").then((m) => m.ResumeBuilderView),
  {
    loading: () => (
      <p className="rounded-ca bg-ca-low px-4 py-12 text-center text-sm text-ca-muted">
        Loading resume builder…
      </p>
    ),
    ssr: false,
  }
);
