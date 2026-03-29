export interface DetectedResponse {
  type: 'json' | 'html' | 'xml' | 'text';
  /** Pretty-printed or raw string for display */
  formatted: string;
  /** Original string value (useful for iframe srcDoc) */
  raw: string;
}

/**
 * Analyses raw response data and classifies it as JSON, HTML, XML, or plain text.
 * Returns a normalised structure so the renderer can pick the right visualisation.
 */
export function detectResponseType(data: unknown): DetectedResponse {
  if (data == null) {
    return { type: 'text', formatted: '', raw: '' };
  }

  // Already an object/array → JSON
  if (typeof data === 'object') {
    const formatted = JSON.stringify(data, null, 2);
    return { type: 'json', formatted, raw: formatted };
  }

  const raw = String(data);
  const trimmed = raw.trim();

  // Try JSON parse first (covers stringified JSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      return { type: 'json', formatted: JSON.stringify(parsed, null, 2), raw };
    } catch {
      // not valid JSON, fall through
    }
  }

  // HTML detection: doctype or common HTML tags
  if (
    /^<!doctype\s+html/i.test(trimmed) ||
    /^<html[\s>]/i.test(trimmed) ||
    /<\/(?:html|body|head|div|p|span|table|form|section)>/i.test(trimmed)
  ) {
    return { type: 'html', formatted: raw, raw };
  }

  // XML detection: xml declaration or root element with xmlns
  if (/^<\?xml\s/i.test(trimmed) || /<\w+[^>]+xmlns[:=]/i.test(trimmed)) {
    return { type: 'xml', formatted: raw, raw };
  }

  // Fallback: if it looks like a single tag-based blob, treat as HTML
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return { type: 'html', formatted: raw, raw };
  }

  return { type: 'text', formatted: raw, raw };
}
