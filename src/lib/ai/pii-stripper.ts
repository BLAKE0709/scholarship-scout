const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_REGEX = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g;

interface PIIStripResult {
  text: string;
  piiDetected: boolean;
  redactions: { type: string; count: number }[];
}

export function stripPII(input: string): PIIStripResult {
  const redactions: { type: string; count: number }[] = [];
  let text = input;

  const emailMatches = text.match(EMAIL_REGEX);
  if (emailMatches) {
    redactions.push({ type: "email", count: emailMatches.length });
    text = text.replace(EMAIL_REGEX, "[REDACTED_EMAIL]");
  }

  const phoneMatches = text.match(PHONE_REGEX);
  if (phoneMatches) {
    redactions.push({ type: "phone", count: phoneMatches.length });
    text = text.replace(PHONE_REGEX, "[REDACTED_PHONE]");
  }

  const ssnMatches = text.match(SSN_REGEX);
  if (ssnMatches) {
    redactions.push({ type: "ssn", count: ssnMatches.length });
    text = text.replace(SSN_REGEX, "[REDACTED_SSN]");
  }

  const ccMatches = text.match(CREDIT_CARD_REGEX);
  if (ccMatches) {
    redactions.push({ type: "credit_card", count: ccMatches.length });
    text = text.replace(CREDIT_CARD_REGEX, "[REDACTED_CC]");
  }

  const piiDetected = redactions.length > 0;

  if (piiDetected) {
    console.warn(
      `[AI Gateway] PII detected and redacted:`,
      redactions.map((r) => `${r.count} ${r.type}(s)`).join(", "),
    );
  }

  return { text, piiDetected, redactions };
}
