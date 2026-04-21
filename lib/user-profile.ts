import type {
  StaticContact,
  StaticEducation,
  StaticUserProfile,
} from "./static-profile";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseContact(raw: unknown): StaticContact | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const phone = String(o.phone ?? "").trim();
  const email = String(o.email ?? "").trim();
  const linkedin = String(o.linkedin ?? "").trim();
  const github = String(o.github ?? "").trim();
  if (!email) return null;
  return { phone, email, linkedin, github };
}

function parseEducationEntry(raw: unknown): StaticEducation | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const degree = String(o.degree ?? "").trim();
  const institution = String(o.institution ?? "").trim();
  const duration = String(o.duration ?? "").trim();
  if (!degree || !institution) return null;
  return { degree, institution, duration };
}

function parseExperience(raw: unknown): StaticUserProfile["experience"][0] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const role = String(o.role ?? "").trim();
  const company = String(o.company ?? "").trim();
  const duration = String(o.duration ?? "").trim();
  const resp = Array.isArray(o.responsibilities)
    ? o.responsibilities.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (!role || !company) return null;
  return { role, company, duration, responsibilities: resp };
}

function parseProject(raw: unknown): StaticUserProfile["projects"][0] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name ?? "").trim();
  const description = Array.isArray(o.description)
    ? o.description.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const techStack = Array.isArray(o.techStack)
    ? o.techStack.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (!name) return null;
  return { name, description, techStack };
}

export function tryParseSkillsRecord(
  raw: unknown
): { ok: true; skills: Record<string, string[]> } | { ok: false } {
  const s = parseSkills(raw);
  if (!s) return { ok: false };
  return { ok: true, skills: s };
}

function parseSkills(raw: unknown): Record<string, string[]> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(o)) {
    if (!k.trim()) continue;
    if (!Array.isArray(v)) return null;
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    out[k] = arr;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export type ParseUserProfileResult =
  | { ok: true; profile: StaticUserProfile }
  | { ok: false; error: string };

/**
 * Validate optional API `userProfile` JSON against the static profile shape.
 */
export function tryParseUserProfile(input: unknown): ParseUserProfileResult {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "userProfile must be a JSON object." };
  }
  const o = input as Record<string, unknown>;

  const name = String(o.name ?? "").trim();
  if (!isNonEmptyString(name)) {
    return { ok: false, error: "userProfile.name is required." };
  }

  const contact = parseContact(o.contact);
  if (!contact) {
    return {
      ok: false,
      error: "userProfile.contact must include at least a non-empty email.",
    };
  }

  const summary = String(o.summary ?? "").trim();
  if (!summary) {
    return { ok: false, error: "userProfile.summary is required." };
  }

  const experienceRaw = Array.isArray(o.experience) ? o.experience : [];
  const experience = experienceRaw
    .map(parseExperience)
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (experience.length === 0) {
    return {
      ok: false,
      error: "userProfile.experience must be a non-empty array of roles.",
    };
  }

  const projectsRaw = Array.isArray(o.projects) ? o.projects : [];
  const projects = projectsRaw
    .map(parseProject)
    .filter((x): x is NonNullable<typeof x> => x != null);

  const skills = parseSkills(o.skills);
  if (!skills) {
    return {
      ok: false,
      error:
        "userProfile.skills must be an object mapping category names to string arrays.",
    };
  }

  const educationRaw = Array.isArray(o.education) ? o.education : [];
  const education = educationRaw
    .map(parseEducationEntry)
    .filter((x): x is StaticEducation => x != null);
  if (education.length === 0) {
    return {
      ok: false,
      error: "userProfile.education must be a non-empty array.",
    };
  }

  return {
    ok: true,
    profile: {
      name,
      contact,
      summary,
      experience,
      projects,
      skills,
      education,
    },
  };
}
