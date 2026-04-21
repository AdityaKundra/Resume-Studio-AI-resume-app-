import type { StaticUserProfile } from "./static-profile";
import type { JobDescriptionAnalysis } from "./types";

/** Common tools / platforms to tag separately from generic skills */
const TOOL_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "Git", re: /\bgit\b/i },
  { label: "Docker", re: /\bdocker\b/i },
  { label: "Kubernetes", re: /\bkubernetes\b|\bk8s\b/i },
  { label: "AWS", re: /\baws\b|amazon web services/i },
  { label: "GCP", re: /\bgcp\b|\bgoogle cloud\b/i },
  { label: "Azure", re: /\bazure\b/i },
  { label: "Jira", re: /\bjira\b/i },
  { label: "Confluence", re: /\bconfluence\b/i },
  { label: "Figma", re: /\bfigma\b/i },
  { label: "Postman", re: /\bpostman\b/i },
  { label: "Terraform", re: /\bterraform\b/i },
  { label: "Jenkins", re: /\bjenkins\b/i },
  { label: "CI/CD", re: /\bci\/cd\b|\bcontinuous integration\b/i },
];

const SKILL_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "TypeScript", re: /\btypescript\b|\bts\b(?![a-z])/i },
  { label: "JavaScript", re: /\bjavascript\b|\bjs\b(?![a-z])/i },
  { label: "Python", re: /\bpython\b/i },
  { label: "Java", re: /\bjava\b(?![a-z])/i },
  { label: "Go", re: /\bgolang\b|\bgo\b(?=\s|,|\.|\)|$)/i },
  { label: "Rust", re: /\brust\b/i },
  { label: "C#", re: /\bc#\b|\bc-sharp\b/i },
  { label: "Ruby", re: /\bruby\b/i },
  { label: "PHP", re: /\bphp\b/i },
  { label: "Swift", re: /\bswift\b/i },
  { label: "Kotlin", re: /\bkotlin\b/i },
  { label: "React", re: /\breact\.?js\b|\breact\b/i },
  { label: "Next.js", re: /\bnext\.js\b|\bnextjs\b/i },
  { label: "Vue", re: /\bvue\.?js\b|\bvue\b/i },
  { label: "Angular", re: /\bangular\b/i },
  { label: "Node.js", re: /\bnode\.?js\b|\bnode\b/i },
  { label: "Express", re: /\bexpress\.?js\b|\bexpress\b/i },
  { label: "GraphQL", re: /\bgraphql\b/i },
  { label: "REST", re: /\brest(?:ful)?\s+api\b|\brest\b/i },
  { label: "MongoDB", re: /\bmongo(db)?\b/i },
  { label: "PostgreSQL", re: /\bpostgres(ql)?\b/i },
  { label: "MySQL", re: /\bmysql\b/i },
  { label: "Redis", re: /\bredis\b/i },
  { label: "Elasticsearch", re: /\belasticsearch\b/i },
  { label: "Kafka", re: /\bkafka\b/i },
  { label: "RabbitMQ", re: /\brabbitmq\b/i },
  { label: "SQL", re: /\bsql\b/i },
  { label: "Tailwind CSS", re: /\btailwind\b/i },
  { label: "HTML/CSS", re: /\bhtml\b|\bcss\b/i },
  { label: "Microservices", re: /\bmicroservices\b/i },
  { label: "Machine Learning", re: /\bmachine learning\b|\bml\b/i },
  { label: "AI/LLM", re: /\b(llm|genai|generative ai|openai)\b/i },
];

function flattenProfileSkills(profile: StaticUserProfile): string[] {
  const out: string[] = [];
  for (const v of Object.values(profile.skills)) {
    for (const s of v) out.push(s.toLowerCase());
  }
  for (const p of profile.projects) {
    for (const t of p.techStack) out.push(t.toLowerCase());
  }
  return out;
}

function profileContainsSkill(
  profileLower: string[],
  skill: string
): boolean {
  const s = skill.toLowerCase();
  return profileLower.some(
    (p) => p.includes(s) || s.includes(p) || levenshteinClose(p, s)
  );
}

function levenshteinClose(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 4) return false;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length, 1);
  return dist / maxLen < 0.25;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

function detectSeniority(jd: string): string {
  const t = jd.toLowerCase();
  if (/\b(principal|distinguished|staff)\b/.test(t)) return "Principal / Staff";
  if (/\b(lead|architect)\b/.test(t)) return "Lead / Architect";
  if (/\bsenior\b|\bsr\.?\b/.test(t)) return "Senior";
  if (/\bmid\b|\bintermediate\b/.test(t)) return "Mid-level";
  if (/\bjunior\b|\bjr\.?\b|\bentry\b|\bgraduate\b|\bintern\b/.test(t)) {
    return "Junior / Entry";
  }
  return "Not specified";
}

function extractResponsibilities(jd: string): string[] {
  const lines = jd
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*–—]+\s*/, "").trim())
    .filter((l) => l.length > 12 && l.length < 220);

  const verbs =
    /^(design|build|implement|lead|develop|own|drive|collaborate|work|ensure|optimize|maintain|support|create|deliver|manage|analyze|architect)/i;
  const scored = lines.filter((l) => verbs.test(l));
  const pick = scored.length >= 3 ? scored : lines;
  return pick.slice(0, 8);
}

/**
 * Heuristic JD analysis (no LLM). Pass `userProfile` to compute gaps vs static profile.
 */
export function analyzeJobDescription(
  jobDescription: string,
  userProfile?: StaticUserProfile
): JobDescriptionAnalysis {
  const jd = jobDescription.trim();
  const requiredSkills: string[] = [];
  const tools: string[] = [];

  for (const { label, re } of SKILL_PATTERNS) {
    if (re.test(jd) && !requiredSkills.includes(label)) {
      requiredSkills.push(label);
    }
  }
  for (const { label, re } of TOOL_PATTERNS) {
    if (re.test(jd) && !tools.includes(label)) {
      tools.push(label);
    }
  }

  const seniorityLevel = detectSeniority(jd);
  const keyResponsibilities = extractResponsibilities(jd);

  let missingFromUserProfile: string[] = [];
  if (userProfile) {
    const flat = flattenProfileSkills(userProfile);
    const needed = [...new Set([...requiredSkills, ...tools])];
    missingFromUserProfile = needed.filter(
      (skill) => !profileContainsSkill(flat, skill)
    );
  }

  return {
    requiredSkills,
    tools,
    seniorityLevel,
    keyResponsibilities,
    missingFromUserProfile,
  };
}
