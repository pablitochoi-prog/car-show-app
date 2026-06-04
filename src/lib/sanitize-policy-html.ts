import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "a",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "span",
  "div",
  "img",
];

const allowedAttributes: Record<string, string[]> = {
  a: ["href", "target", "rel", "style"],
  p: ["style"],
  span: ["style"],
  div: ["style"],
  h2: ["style"],
  h3: ["style"],
  li: ["style"],
  img: ["src", "alt", "title", "style"],
};

const TEXT_ALIGN_PATTERN = /^(?:left|center|right|justify)$/;

const POLICY_INLINE_STYLES = {
  color: [
    /^#[0-9a-f]{3,8}$/i,
    /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i,
  ],
  "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
  "font-family": [
    /^Arial, Helvetica, sans-serif$/,
    /^Georgia, serif$/,
    /^'Times New Roman', Times, serif$/,
    /^'Courier New', Courier, monospace$/,
    /^Verdana, Geneva, sans-serif$/,
  ],
  "font-weight": [/^\d{3}$/, /^bold$/, /^normal$/],
  "font-style": [/^(?:italic|normal)$/],
  "text-decoration": [/^(?:underline|none)$/],
  "text-align": [TEXT_ALIGN_PATTERN],
  "max-width": [/^\d+(?:\.\d+)?(?:px|%)$/],
  width: [/^\d+(?:\.\d+)?(?:px|%)$/],
  height: [/^\d+(?:\.\d+)?(?:px|%)$/],
  display: [/^(?:block|inline|inline-block)$/],
  margin: [
    /^0(?:\s+auto)?$/,
    /^\d+(?:\.\d+)?(?:px|em|rem)\s+auto$/,
  ],
} as const;

function isSafeImageSrc(src: string | undefined): boolean {
  if (!src?.trim()) return false;
  try {
    const url = new URL(src.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Sanitize admin-authored policy HTML for safe public rendering.
 * Strips scripts, event handlers, and unsafe URLs while keeping basic formatting.
 */
export function sanitizePolicyHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  return sanitizeHtml(trimmed, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes,
    allowedSchemes: ["http", "https", "mailto"],
    allowedStyles: {
      "*": Object.fromEntries(
        Object.entries(POLICY_INLINE_STYLES).map(([key, value]) => [key, [...value]])
      ),
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href;
        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            rel: "noopener noreferrer",
            ...(attribs.target === "_blank" ? { target: "_blank" } : {}),
          },
        };
      },
      img: (tagName, attribs) => {
        if (!isSafeImageSrc(attribs.src)) {
          return { tagName: "", attribs: {} };
        }
        const next: Record<string, string> = {
          src: attribs.src.trim(),
        };
        const alt = attribs.alt?.trim();
        if (alt) next.alt = alt;
        const title = attribs.title?.trim();
        if (title) next.title = title;
        if (attribs.style) next.style = attribs.style;
        return { tagName, attribs: next };
      },
    },
  }).trim();
}

export function isPolicyHtmlEmpty(html: string | null | undefined): boolean {
  if (html == null) return true;
  const stripped = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return stripped.length === 0;
}
