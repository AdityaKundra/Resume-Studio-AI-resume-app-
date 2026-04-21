import fs from "node:fs";
import path from "node:path";

type LogLevel = "info" | "warn" | "error" | "debug";

export type AtsHistoryEntry = {
  at: string;
  score: number;
  keywordScore: number;
  semanticScore: number;
  sectionScore: number;
  formattingScore: number;
};

const MAX_ATS_HISTORY = 200;
const atsHistory: AtsHistoryEntry[] = [];

function timestamp(): string {
  return new Date().toISOString();
}

function shouldWriteFile(): boolean {
  return (
    process.env.LOG_TO_FILE === "1" ||
    process.env.LOG_TO_FILE === "true"
  );
}

function logFilePath(): string {
  const root = process.cwd();
  return path.join(root, "logs", "app.log");
}

function shouldSanitizeFileMeta(): boolean {
  return (
    process.env.LOG_REDACT_FILE !== "0" &&
    process.env.LOG_REDACT_FILE !== "false"
  );
}

const SENSITIVE_META_KEYS =
  /jobdescription|resume|profile|payload|body|userprofile|content|choices|message/i;

function sanitizeForFileLog(value: unknown, depth: number): unknown {
  if (depth > 5) return "[truncated-depth]";
  if (value == null) return value;
  if (typeof value === "string") {
    return value.length > 240
      ? `${value.slice(0, 240)}…[truncated ${value.length} chars]`
      : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((x) => sanitizeForFileLog(x, depth + 1));
  }
  const o = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (SENSITIVE_META_KEYS.test(k)) {
      out[k] =
        typeof v === "string"
          ? `[redacted string len=${v.length}]`
          : "[redacted]";
    } else {
      out[k] = sanitizeForFileLog(v, depth + 1);
    }
  }
  return out;
}

function sanitizeMetaForFile(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta || !shouldSanitizeFileMeta()) return meta;
  return sanitizeForFileLog(meta, 0) as Record<string, unknown>;
}

function writeFileLine(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (!shouldWriteFile()) return;
  try {
    const dir = path.dirname(logFilePath());
    fs.mkdirSync(dir, { recursive: true });
    const line = formatLine(level, message, sanitizeMetaForFile(meta));
    fs.appendFileSync(logFilePath(), line + "\n", "utf8");
  } catch {
    // ignore file logging failures
  }
}

function formatLine(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const base = `[${timestamp()}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return base;
    }
  }
  return base;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    const line = formatLine("info", message, meta);
    console.log(line);
    writeFileLine("info", message, meta);
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    const line = formatLine("warn", message, meta);
    console.warn(line);
    writeFileLine("warn", message, meta);
  },

  error(message: string, err?: unknown, meta?: Record<string, unknown>): void {
    const errMsg =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err;
    const line = formatLine("error", message, { ...meta, err: errMsg });
    console.error(line);
    writeFileLine("error", message, { ...meta, err: errMsg });
  },

  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.DEBUG_LOGS !== "1" && process.env.DEBUG_LOGS !== "true") {
      return;
    }
    const line = formatLine("debug", message, meta);
    console.debug(line);
    writeFileLine("debug", message, meta);
  },

  /** Wall-clock duration for an operation (ms). */
  timing(operation: string, durationMs: number, meta?: Record<string, unknown>): void {
    this.info(`timing:${operation}`, { durationMs, ...meta });
  },

  recordAts(entry: Omit<AtsHistoryEntry, "at">): void {
    const full: AtsHistoryEntry = { ...entry, at: timestamp() };
    atsHistory.push(full);
    if (atsHistory.length > MAX_ATS_HISTORY) {
      atsHistory.splice(0, atsHistory.length - MAX_ATS_HISTORY);
    }
    this.debug("ats:recorded", full as unknown as Record<string, unknown>);
  },

  getAtsHistory(): readonly AtsHistoryEntry[] {
    return [...atsHistory];
  },
};
