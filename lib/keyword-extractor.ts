/**
 * Extracts JD-aligned keywords for ATS matching and resume generation prompts.
 * Output is deduplicated; matching uses lowercase; display forms preserve JD wording where possible.
 */

export type ExtractedKeywords = {
  coreSkills: string[];
  tools: string[];
  softSkills: string[];
  phrases: string[];
};

const MAX_ATS_KEYWORDS = 40;
const MIN_ATS_KEYWORDS = 25;

/** Common tools / platforms (substring match in JD). */
const TOOL_ALIASES: { pattern: RegExp; display: string }[] = [
  { pattern: /\bgithub\s*actions\b/gi, display: "GitHub Actions" },
  { pattern: /\bgitlab\s*ci\b/gi, display: "GitLab CI" },
  { pattern: /\bterraform\b/gi, display: "Terraform" },
  { pattern: /\bansible\b/gi, display: "Ansible" },
  { pattern: /\bjenkins\b/gi, display: "Jenkins" },
  { pattern: /\bcircleci\b/gi, display: "CircleCI" },
  { pattern: /\bkubernetes\b|\bk8s\b/gi, display: "Kubernetes" },
  { pattern: /\bdocker\b/gi, display: "Docker" },
  { pattern: /\bhelm\b/gi, display: "Helm" },
  { pattern: /\bprometheus\b/gi, display: "Prometheus" },
  { pattern: /\bgrafana\b/gi, display: "Grafana" },
  { pattern: /\bdatadog\b/gi, display: "Datadog" },
  { pattern: /\bsplunk\b/gi, display: "Splunk" },
  { pattern: /\bnew\s*relic\b/gi, display: "New Relic" },
  { pattern: /\baws\b|amazon\s*web\s*services/gi, display: "AWS" },
  { pattern: /\bgcp\b|\bgoogle\s*cloud\b/gi, display: "GCP" },
  { pattern: /\bazure\b/gi, display: "Azure" },
  { pattern: /\bsnowflake\b/gi, display: "Snowflake" },
  { pattern: /\bdatabricks\b/gi, display: "Databricks" },
  { pattern: /\bredis\b/gi, display: "Redis" },
  { pattern: /\bkafka\b/gi, display: "Kafka" },
  { pattern: /\brabbitmq\b/gi, display: "RabbitMQ" },
  { pattern: /\belasticsearch\b/gi, display: "Elasticsearch" },
  { pattern: /\bpostgresql\b|\bpostgres\b/gi, display: "PostgreSQL" },
  { pattern: /\bmongodb\b|\bmongo\b/gi, display: "MongoDB" },
  { pattern: /\bmysql\b/gi, display: "MySQL" },
  { pattern: /\bdynamodb\b/gi, display: "DynamoDB" },
  { pattern: /\bcassandra\b/gi, display: "Cassandra" },
  { pattern: /\bgraphql\b/gi, display: "GraphQL" },
  { pattern: /\brest\s*api\b|\brestful\b/gi, display: "REST APIs" },
  { pattern: /\bgit\b/gi, display: "Git" },
];

/** Languages, frameworks, runtimes (display form). */
const CORE_ALIASES: { pattern: RegExp; display: string }[] = [
  { pattern: /\bnode\.?js\b/gi, display: "Node.js" },
  { pattern: /\breact\.?js\b|\breact\b/gi, display: "React" },
  { pattern: /\bnext\.?js\b/gi, display: "Next.js" },
  { pattern: /\bvue\.?js\b|\bvue\b/gi, display: "Vue" },
  { pattern: /\bangular\b/gi, display: "Angular" },
  { pattern: /\bsvelte\b/gi, display: "Svelte" },
  { pattern: /\btypescript\b|\bts\b(?!\w)/gi, display: "TypeScript" },
  { pattern: /\bjavascript\b|\bjs\b(?!\w)/gi, display: "JavaScript" },
  { pattern: /\bpython\b/gi, display: "Python" },
  { pattern: /\bjava\b/gi, display: "Java" },
  { pattern: /\bgo\b(?!\w)/gi, display: "Go" },
  { pattern: /\brust\b/gi, display: "Rust" },
  { pattern: /\bc\+\+\b|\bcpp\b/gi, display: "C++" },
  { pattern: /\bc#\b/gi, display: "C#" },
  { pattern: /\bgolang\b/gi, display: "Go" },
  { pattern: /\bruby\b/gi, display: "Ruby" },
  { pattern: /\brails\b/gi, display: "Rails" },
  { pattern: /\bgin\b/gi, display: "Gin" },
  { pattern: /\bfastapi\b/gi, display: "FastAPI" },
  { pattern: /\bdjango\b/gi, display: "Django" },
  { pattern: /\bflask\b/gi, display: "Flask" },
  { pattern: /\bspring\s*boot\b/gi, display: "Spring Boot" },
  { pattern: /\bexpress\b/gi, display: "Express" },
  { pattern: /\bprisma\b/gi, display: "Prisma" },
  { pattern: /\bsequelize\b/gi, display: "Sequelize" },
  { pattern: /\btailwind\b/gi, display: "Tailwind CSS" },
];

const PHRASE_PATTERNS: { pattern: RegExp; display: string }[] = [
  { pattern: /\bci\s*\/\s*cd\b/gi, display: "CI/CD" },
  { pattern: /\bcontinuous\s+integration\b/gi, display: "continuous integration" },
  { pattern: /\bcontinuous\s+deployment\b/gi, display: "continuous deployment" },
  { pattern: /\bmicroservices?\b/gi, display: "microservices" },
  { pattern: /\bevent[\s-]driven\b/gi, display: "event-driven" },
  { pattern: /\bdistributed\s+systems?\b/gi, display: "distributed systems" },
  { pattern: /\bsystem\s+design\b/gi, display: "system design" },
  { pattern: /\bapi\s+design\b/gi, display: "API design" },
  { pattern: /\bdata\s+pipelines?\b/gi, display: "data pipelines" },
  { pattern: /\bmachine\s+learning\b/gi, display: "machine learning" },
  { pattern: /\bdeep\s+learning\b/gi, display: "deep learning" },
  { pattern: /\bllm\b|\blarge\s+language\s+models?\b/gi, display: "LLMs" },
  { pattern: /\bagile\b/gi, display: "Agile" },
  { pattern: /\bscrum\b/gi, display: "Scrum" },
  { pattern: /\bdevops\b/gi, display: "DevOps" },
  { pattern: /\bsite\s+reliability\b/gi, display: "site reliability" },
  { pattern: /\bobservability\b/gi, display: "observability" },
  { pattern: /\btest[\s-]driven\b/gi, display: "test-driven development" },
];

const SOFT_SKILL_PATTERNS: { pattern: RegExp; display: string }[] = [
  { pattern: /\bleadership\b/gi, display: "leadership" },
  { pattern: /\bmentoring\b/gi, display: "mentoring" },
  { pattern: /\bstakeholder\s+management\b/gi, display: "stakeholder management" },
  { pattern: /\bcross[\s-]functional\b/gi, display: "cross-functional" },
  { pattern: /\bcommunication\b/gi, display: "communication" },
  { pattern: /\bcollaboration\b/gi, display: "collaboration" },
  { pattern: /\bproblem[\s-]solving\b/gi, display: "problem-solving" },
  { pattern: /\bownership\b/gi, display: "ownership" },
];

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function uniquePush(arr: string[], value: string, seen: Set<string>) {
  const k = normalizeKey(value);
  if (k.length < 2 || seen.has(k)) return;
  seen.add(k);
  arr.push(value.trim());
}

function extractQuotedPhrases(text: string): string[] {
  const out: string[] = [];
  const re = /["']([a-z0-9][^"']{2,80})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const inner = m[1]?.trim();
    if (inner && inner.split(/\s+/).length <= 8) out.push(inner);
  }
  return out;
}

/**
 * Extract structured keywords from a job description.
 */
export function extractKeywords(jobDescription: string): ExtractedKeywords {
  const text = jobDescription || "";
  const seen = new Set<string>();

  const phrases: string[] = [];
  const tools: string[] = [];
  const coreSkills: string[] = [];
  const softSkills: string[] = [];

  for (const q of extractQuotedPhrases(text)) {
    uniquePush(phrases, q, seen);
  }

  for (const { pattern, display } of PHRASE_PATTERNS) {
    if (text.match(pattern)) {
      uniquePush(phrases, display, seen);
    }
  }

  for (const { pattern, display } of TOOL_ALIASES) {
    if (text.match(pattern)) {
      uniquePush(tools, display, seen);
    }
  }

  for (const { pattern, display } of CORE_ALIASES) {
    if (text.match(pattern)) {
      uniquePush(coreSkills, display, seen);
    }
  }

  for (const { pattern, display } of SOFT_SKILL_PATTERNS) {
    if (text.match(pattern)) {
      uniquePush(softSkills, display, seen);
    }
  }

  return { coreSkills, tools, softSkills, phrases };
}

/**
 * Single flat list for ATS (prioritizes phrases & tools), capped for scoring stability.
 */
export function keywordsForAtsMatching(
  extracted: ExtractedKeywords,
  jobDescription: string
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (s: string) => {
    const k = normalizeKey(s);
    if (k.length < 2 || seen.has(k)) return;
    seen.add(k);
    out.push(s.trim());
  };

  for (const p of extracted.phrases) push(p);
  for (const t of extracted.tools) push(t);
  for (const c of extracted.coreSkills) push(c);
  for (const s of extracted.softSkills) push(s);

  if (out.length < MIN_ATS_KEYWORDS) {
    const extra = fallbackTokensFromJDText(jobDescription);
    for (const t of extra) {
      push(t);
      if (out.length >= MAX_ATS_KEYWORDS) break;
    }
  }

  return out.slice(0, MAX_ATS_KEYWORDS);
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "our",
  "are",
  "this",
  "that",
  "from",
  "your",
  "will",
  "have",
  "has",
  "been",
  "was",
  "not",
  "all",
  "any",
  "can",
  "who",
  "what",
  "when",
  "how",
  "why",
  "into",
  "more",
  "than",
  "such",
  "also",
  "their",
  "they",
  "them",
  "work",
  "team",
  "role",
  "job",
  "description",
  "including",
  "other",
  "years",
  "year",
  "experience",
  "looking",
  "seeking",
  "responsible",
  "ability",
  "must",
  "should",
  "nice",
  "well",
  "strong",
  "excellent",
  "good",
]);

function fallbackTokensFromJDText(jobDescription: string): string[] {
  const words =
    jobDescription.match(/\b[a-z][a-z0-9+.#-]{2,}\b/gi) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    const low = w.toLowerCase();
    if (STOP.has(low) || seen.has(low)) continue;
    seen.add(low);
    out.push(w);
  }
  return out;
}
