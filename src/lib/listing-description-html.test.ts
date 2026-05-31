import { describe, expect, it } from "vitest";
import {
  listingDescriptionToEditorHtml,
  richTextToPlainText,
  sanitizeListingDescriptionHtml,
} from "./listing-description-html";

describe("listingDescriptionToEditorHtml", () => {
  it("wraps plain text in a paragraph", () => {
    expect(listingDescriptionToEditorHtml("One owner\nGarage kept")).toBe(
      "<p>One owner<br>Garage kept</p>",
    );
  });

  it("passes through existing HTML", () => {
    expect(listingDescriptionToEditorHtml("<p><strong>Nice</strong></p>")).toBe(
      "<p><strong>Nice</strong></p>",
    );
  });
});

describe("sanitizeListingDescriptionHtml", () => {
  it("keeps allowed formatting tags", () => {
    expect(
      sanitizeListingDescriptionHtml(
        '<p style="color:#b91c1c"><strong>Red</strong> text</p>',
      ),
    ).toContain("<strong>Red</strong>");
  });

  it("returns null for empty editor output", () => {
    expect(sanitizeListingDescriptionHtml("<p></p>")).toBeNull();
  });
});

describe("richTextToPlainText", () => {
  it("converts basic HTML to plain text", () => {
    expect(
      richTextToPlainText("<p><strong>Hello</strong></p><ul><li>One</li></ul>"),
    ).toContain("Hello");
    expect(
      richTextToPlainText("<p><strong>Hello</strong></p><ul><li>One</li></ul>"),
    ).toContain("One");
  });
});
