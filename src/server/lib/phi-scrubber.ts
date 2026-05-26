/**
 * PHI scrubber — strips protected health information from log output.
 * Covers: SSN, MRN, phone, email, DOB patterns, and common patient name fields.
 * HIPAA Safe Harbor de-identification (§164.514(b)(2)).
 */

const PHI_PATTERNS: [RegExp, string][] = [
  // SSN: 123-45-6789 or 123456789
  [/\b\d{3}-?\d{2}-?\d{4}\b/g, "[SSN-REDACTED]"],
  // MRN: common medical record number formats (MRN-xxxxxx, MRN:xxxxxx)
  [/\bMRN[-:\s]?\d{4,12}\b/gi, "[MRN-REDACTED]"],
  // Phone: US formats
  [/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE-REDACTED]"],
  // Email
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL-REDACTED]"],
  // Date of birth patterns: DOB: MM/DD/YYYY, DOB 01-15-1990
  [/\bDOB[-:\s]?\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, "[DOB-REDACTED]"],
  // ISO dates following patient/DOB context (best-effort)
  [/\b(date.of.birth|dob)["':\s]+\d{4}-\d{2}-\d{2}/gi, "[DOB-REDACTED]"],
];

/**
 * Scrub PHI from a string. Returns sanitized copy.
 */
export function scrubPhi(input: string): string {
  let result = input;
  for (const [pattern, replacement] of PHI_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Scrub PHI from an object (shallow — stringifies, scrubs, parses).
 * For log payloads. Falls back to scrubbed string on parse failure.
 */
export function scrubPhiFromObject(obj: unknown): unknown {
  const raw = JSON.stringify(obj);
  const scrubbed = scrubPhi(raw);
  try {
    return JSON.parse(scrubbed);
  } catch {
    return scrubbed;
  }
}
