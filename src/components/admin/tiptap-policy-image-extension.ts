import Image from "@tiptap/extension-image";

/** Preset max-width values stored inline on policy images. */
export const POLICY_IMAGE_SIZE_STYLES = {
  small: "max-width: 25%; height: auto;",
  medium: "max-width: 50%; height: auto;",
  large: "max-width: 75%; height: auto;",
  full: "max-width: 100%; height: auto;",
} as const;

export type PolicyImageSize = keyof typeof POLICY_IMAGE_SIZE_STYLES;

export const DEFAULT_POLICY_IMAGE_STYLE = POLICY_IMAGE_SIZE_STYLES.medium;

export function policyImageSizeFromStyle(
  style: string | undefined | null,
): PolicyImageSize {
  if (!style) return "medium";
  const entry = (
    Object.entries(POLICY_IMAGE_SIZE_STYLES) as [PolicyImageSize, string][]
  ).find(([, value]) => value === style.trim());
  return entry?.[0] ?? "medium";
}

/** Policy editor images with per-image max-width (persisted in HTML style). */
export const PolicyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: DEFAULT_POLICY_IMAGE_STYLE,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          const style =
            typeof attributes.style === "string" && attributes.style.trim()
              ? attributes.style
              : DEFAULT_POLICY_IMAGE_STYLE;
          return { style, class: "policy-editor-image" };
        },
      },
    };
  },
});
