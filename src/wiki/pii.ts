export interface PiiFinding {
  type: string;
  value: string;
  file: string;
  line: number;
}

export interface PiiReport {
  findings: PiiFinding[];
  totalFiles: number;
  filesWithPii: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const PII_PATTERNS: Array<{ type: string; regex: RegExp; filter?: (match: string) => boolean }> = [
  { type: "email", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  {
    type: "phone",
    // Needs a leading + or separators, so dates and plain numbers do not match.
    regex: /(?:\+\d[\d\s().-]{8,}\d|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/g,
    filter: (match) => !DATE_PATTERN.test(match.trim())
  },
  { type: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "api_key", regex: /\b(?:sk-|pk_|api[_-]?key[=:]\s*)[A-Za-z0-9_-]{20,}\b/gi },
  {
    type: "ip_address",
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g
  }
];

/** Scan markdown for likely PII. Skips fenced code blocks. Returns findings with line numbers. */
export function scanPii(markdown: string, filePath: string): PiiFinding[] {
  const findings: PiiFinding[] = [];
  let inCodeBlock = false;

  markdown.split("\n").forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      return;
    }
    for (const { type, regex, filter } of PII_PATTERNS) {
      for (const match of line.matchAll(regex)) {
        if (filter && !filter(match[0])) {
          continue;
        }
        findings.push({ type, value: match[0], file: filePath, line: index + 1 });
      }
    }
  });

  return findings;
}

export function scanPiiReport(pages: Array<{ content: string; pagePath: string }>): PiiReport {
  const findings = pages.flatMap((page) => scanPii(page.content, page.pagePath));
  return {
    findings,
    totalFiles: pages.length,
    filesWithPii: new Set(findings.map((f) => f.file)).size
  };
}

/** Redact every finding in place. Used before anything is stored or served. */
export function redactPii(markdown: string): string {
  let out = markdown;
  for (const { type, regex, filter } of PII_PATTERNS) {
    out = out.replace(regex, (match) =>
      filter && !filter(match) ? match : `[REDACTED_${type.toUpperCase()}]`
    );
  }
  return out;
}
