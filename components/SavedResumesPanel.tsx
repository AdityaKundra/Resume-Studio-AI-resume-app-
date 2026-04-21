"use client";

import { useEffect, useRef, useState } from "react";
import {
  deleteUserVersion,
  exportUserVersionsJson,
  importUserVersionsFromJson,
  loadUserVersions,
} from "@/lib/persistence";
import type { SavedResumeVersion } from "@/lib/types";

type Props = {
  onSelect: (v: SavedResumeVersion) => void;
  refreshToken: number;
  onImported?: () => void;
};

export function SavedResumesPanel({
  onSelect,
  refreshToken,
  onImported,
}: Props) {
  const [versions, setVersions] = useState<SavedResumeVersion[]>([]);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadUserVersions().then(setVersions);
  }, [refreshToken]);

  const refreshList = () => {
    void loadUserVersions().then((v) => {
      setVersions(v);
      onImported?.();
    });
  };

  const exportAll = () => {
    void exportUserVersionsJson().then((json) => {
      const blob = new Blob([json], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-versions-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setImportMsg("Export downloaded.");
      window.setTimeout(() => setImportMsg(null), 3000);
    });
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportMsg(null);
    const text = await file.text();
    const mode =
      window.confirm(
        "Merge imported versions with existing (OK), or replace all (Cancel)?"
      )
        ? "merge"
        : "replace";
    const res = await importUserVersionsFromJson(text, mode);
    if (!res.ok) {
      setImportMsg(res.error);
      return;
    }
    setImportMsg(
      `Imported ${res.count} version(s) (${mode === "merge" ? "merged" : "replaced"}).`
    );
    refreshList();
  };

  if (versions.length === 0) {
    return (
      <div className="rounded-ca bg-ca-low px-3 py-6 text-center outline outline-1 outline-dashed outline-ca-ink/15">
        <p className="text-sm font-medium text-ca-ink">No saved versions</p>
        <p className="mx-auto mt-2 max-w-[200px] text-xs leading-relaxed text-ca-muted">
          Each successful generate or improve is saved for quick recall (browser
          or cloud when MongoDB is configured).
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportAll}
          className="rounded-ca bg-ca-highest px-2.5 py-1 text-[11px] font-semibold text-ca-ink shadow-ca hover:bg-ca-container"
        >
          Export all
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-ca bg-ca-highest px-2.5 py-1 text-[11px] font-semibold text-ca-ink shadow-ca hover:bg-ca-container"
        >
          Import…
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={onFile}
          aria-label="Import resume versions JSON file"
        />
      </div>
      {importMsg && (
        <p className="mb-2 text-[11px] text-ca-muted" role="status">
          {importMsg}
        </p>
      )}
      <p className="mb-3 text-[11px] font-medium text-ca-muted">
        {versions.length} version{versions.length === 1 ? "" : "s"} · synced when
        DB is enabled
      </p>
      <ul className="scrollbar-thin max-h-72 space-y-3 overflow-y-auto pr-1">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-start justify-between gap-2 rounded-ca bg-ca-lowest px-3 py-3 shadow-ca transition hover:ring-1 hover:ring-ca-primary/25"
          >
            <button
              type="button"
              onClick={() => onSelect(v)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="line-clamp-2 text-sm font-medium text-ca-ink">
                {v.jobTitle}
              </span>
              <span className="mt-0.5 block text-[11px] text-ca-muted">
                {new Date(v.timestamp).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · ATS{" "}
                <span className="tabular-nums font-semibold text-ca-primary-ink">
                  {v.atsScore}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void deleteUserVersion(v.id).then(() => {
                  void loadUserVersions().then(setVersions);
                });
              }}
              className="shrink-0 rounded-ca px-2 py-1 text-[11px] font-medium text-ca-danger hover:bg-ca-danger-soft"
              aria-label="Delete saved version"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
