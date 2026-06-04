import { describe, expect, it } from "vitest";
import { isPolicyHtmlEmpty, sanitizePolicyHtml } from "./sanitize-policy-html";

describe("sanitizePolicyHtml", () => {
  it("preserves basic formatting", () => {
    const input =
      '<p><strong>Bold</strong> and <a href="https://example.com">link</a></p>';
    const out = sanitizePolicyHtml(input);
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain('href="https://example.com"');
  });

  it("strips script tags and unsafe images", () => {
    const out = sanitizePolicyHtml(
      '<p>Hi</p><script>alert(1)</script><img src=x onerror="alert(1)">',
    );
    expect(out).not.toContain("<script");
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("<img");
  });

  it("allows https images and text alignment", () => {
    const out = sanitizePolicyHtml(
      '<p style="text-align: center;"><img src="https://cdn.example.com/a.png" alt="Opt-in"></p>',
    );
    expect(out).toContain('src="https://cdn.example.com/a.png"');
    expect(out).toContain('alt="Opt-in"');
    expect(out).toMatch(/text-align:\s*center/);
  });

  it("allows image max-width sizing styles", () => {
    const out = sanitizePolicyHtml(
      '<img src="https://cdn.example.com/a.png" alt="x" style="max-width: 50%; height: auto;" />',
    );
    expect(out).toMatch(/max-width:\s*50%/);
  });

  it("blocks non-http image sources", () => {
    const out = sanitizePolicyHtml(
      '<img src="javascript:alert(1)" alt="x">',
    );
    expect(out).not.toContain("<img");
  });

  it("blocks javascript: links", () => {
    const out = sanitizePolicyHtml('<a href="javascript:alert(1)">x</a>');
    expect(out).not.toContain("javascript:");
  });

  it("allows color and font-size inline styles", () => {
    const out = sanitizePolicyHtml(
      '<p><span style="color: rgb(255, 0, 0); font-size: 18px;">Red</span></p>',
    );
    expect(out).toContain("color:");
    expect(out).toContain("font-size:");
  });

  it("preserves bullet and numbered lists", () => {
    const out = sanitizePolicyHtml(
      "<ul><li><p>First</p></li></ul><ol><li><p>Second</p></li></ol>",
    );
    expect(out).toContain("<ul>");
    expect(out).toContain("<ol>");
    expect(out).toContain("First");
    expect(out).toContain("Second");
  });

  it("removes disallowed style properties", () => {
    const out = sanitizePolicyHtml(
      '<p style="background-image: url(javascript:alert(1))">x</p>',
    );
    expect(out).not.toContain("background-image");
  });
});

describe("isPolicyHtmlEmpty", () => {
  it("treats empty and whitespace-only HTML as empty", () => {
    expect(isPolicyHtmlEmpty(null)).toBe(true);
    expect(isPolicyHtmlEmpty("<p></p>")).toBe(true);
    expect(isPolicyHtmlEmpty("<p>&nbsp;</p>")).toBe(true);
    expect(isPolicyHtmlEmpty("<p>Hello</p>")).toBe(false);
  });
});
