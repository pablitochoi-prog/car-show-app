"use client";

import { useEffect, useRef, useState } from "react";
import type { Extensions } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  DEFAULT_POLICY_IMAGE_STYLE,
  PolicyImage,
  POLICY_IMAGE_SIZE_STYLES,
  policyImageSizeFromStyle,
  type PolicyImageSize,
} from "@/components/admin/tiptap-policy-image-extension";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FontSizeExtension } from "@/components/admin/tiptap-font-size-extension";
import {
  FontFamilyExtension,
  RICH_TEXT_FONT_FAMILIES,
} from "@/components/admin/tiptap-font-family-extension";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Underline as UnderlineIcon,
  Unlink,
} from "lucide-react";

const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "20px" },
  { label: "Extra large", value: "24px" },
] as const;

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#111827" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Red", value: "#b91c1c" },
  { label: "Gray", value: "#4b5563" },
] as const;

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
  /** Shorter editor surface for dialogs and compact forms. */
  compact?: boolean;
  idPrefix?: string;
  /** Policy editors: upload images and align blocks (left / center / right). */
  enableImages?: boolean;
  enableTextAlign?: boolean;
  imageUploadUrl?: string;
};

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      disabled={disabled}
      onMouseDown={(e) => {
        // Keep editor selection when clicking toolbar controls.
        e.preventDefault();
      }}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="size-8"
    >
      {children}
    </Button>
  );
}

function buildEditorExtensions(
  enableImages: boolean,
  enableTextAlign: boolean,
): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: false,
      underline: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer",
        target: "_blank",
      },
    }),
    TextStyle,
    Color,
    FontSizeExtension,
    FontFamilyExtension,
  ];

  if (enableTextAlign) {
    extensions.push(
      TextAlign.configure({
        types: enableImages
          ? ["heading", "paragraph", "image"]
          : ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
    );
  }

  if (enableImages) {
    extensions.push(
      PolicyImage.configure({
        inline: false,
        allowBase64: false,
      }),
    );
  }

  return extensions;
}

export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter policy content…",
  "aria-label": ariaLabel = "Policy editor",
  compact = false,
  idPrefix = "rich-text",
  enableImages = false,
  enableTextAlign = false,
  imageUploadUrl = "/api/admin/legal-policies/image",
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);

  const editor = useEditor({
    extensions: buildEditorExtensions(enableImages, enableTextAlign),
    content: value || "<p></p>",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "policy-editor-surface px-3 py-2 text-sm leading-relaxed focus:outline-none",
          compact ? "min-h-[7rem]" : "min-h-[220px]",
        ),
        "aria-label": ariaLabel,
        "data-placeholder": placeholder,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url == null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  }

  function insertImageByUrl() {
    if (!editor) return;
    const url = window.prompt("Image URL", "https://");
    if (url == null) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    editor
      .chain()
      .focus()
      .setImage({ src: trimmed, style: DEFAULT_POLICY_IMAGE_STYLE })
      .run();
  }

  function setSelectedImageSize(size: PolicyImageSize) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .updateAttributes("image", { style: POLICY_IMAGE_SIZE_STYLES[size] })
      .run();
  }

  async function uploadAndInsertImage(file: File) {
    if (!editor) return;
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(imageUploadUrl, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Image upload failed");
      }
      editor
        .chain()
        .focus()
        .setImage({ src: data.url, style: DEFAULT_POLICY_IMAGE_STYLE })
        .run();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Could not upload image",
      );
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadAndInsertImage(file);
  }

  if (!editor) {
    return (
      <div className="rounded-md border bg-muted/30 px-3 py-8 text-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-background",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>

        <span className="mx-1 hidden h-6 w-px bg-border sm:inline" aria-hidden />

        <label className="sr-only" htmlFor={`${idPrefix}-font-family`}>
          Font
        </label>
        <select
          id={`${idPrefix}-font-family`}
          disabled={disabled}
          className="h-8 max-w-[7.5rem] rounded-md border border-input bg-background px-2 text-xs"
          value={
            RICH_TEXT_FONT_FAMILIES.find((font) =>
              editor.isActive("textStyle", { fontFamily: font.value }),
            )?.value ?? ""
          }
          onChange={(e) => {
            const family = e.target.value;
            if (!family) {
              editor.chain().focus().unsetFontFamily().run();
            } else {
              editor.chain().focus().setFontFamily(family).run();
            }
          }}
        >
          {RICH_TEXT_FONT_FAMILIES.map((font) => (
            <option key={font.label} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${idPrefix}-font-size`}>
          Font size
        </label>
        <select
          id={`${idPrefix}-font-size`}
          disabled={disabled}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          value={
            FONT_SIZES.find((s) => editor.isActive("textStyle", { fontSize: s.value }))
              ?.value ?? "16px"
          }
          onChange={(e) => {
            const size = e.target.value;
            if (size === "16px") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(size).run();
            }
          }}
        >
          {FONT_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${idPrefix}-text-color`}>
          Text color
        </label>
        <select
          id={`${idPrefix}-text-color`}
          disabled={disabled}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          defaultValue=""
          onChange={(e) => {
            const color = e.target.value;
            if (!color) {
              editor.chain().focus().unsetColor().run();
            } else {
              editor.chain().focus().setColor(color).run();
            }
          }}
        >
          {TEXT_COLORS.map((c) => (
            <option key={c.label} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <span className="mx-1 hidden h-6 w-px bg-border sm:inline" aria-hidden />

        <ToolbarButton
          title="Add link"
          disabled={disabled}
          onClick={setLink}
        >
          <Link2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          disabled={disabled || !editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink className="size-4" />
        </ToolbarButton>

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>

        {enableTextAlign ? (
          <>
            <span className="mx-1 hidden h-6 w-px bg-border sm:inline" aria-hidden />
            <ToolbarButton
              title="Align left"
              active={editor.isActive({ textAlign: "left" })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
            >
              <AlignLeft className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align center"
              active={editor.isActive({ textAlign: "center" })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
            >
              <AlignCenter className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              title="Align right"
              active={editor.isActive({ textAlign: "right" })}
              disabled={disabled}
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
            >
              <AlignRight className="size-4" />
            </ToolbarButton>
          </>
        ) : null}

        {enableImages ? (
          <>
            <span className="mx-1 hidden h-6 w-px bg-border sm:inline" aria-hidden />
            {editor.isActive("image") ? (
              <>
                <label className="sr-only" htmlFor={`${idPrefix}-image-size`}>
                  Image size
                </label>
                <select
                  id={`${idPrefix}-image-size`}
                  disabled={disabled}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={policyImageSizeFromStyle(
                    editor.getAttributes("image").style as string | undefined,
                  )}
                  onChange={(e) =>
                    setSelectedImageSize(e.target.value as PolicyImageSize)
                  }
                >
                  <option value="small">Image 25%</option>
                  <option value="medium">Image 50%</option>
                  <option value="large">Image 75%</option>
                  <option value="full">Image 100%</option>
                </select>
              </>
            ) : null}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={handleImageFileChange}
            />
            <ToolbarButton
              title="Upload image"
              disabled={disabled || imageUploading}
              onClick={() => imageInputRef.current?.click()}
            >
              {imageUploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageIcon className="size-4" />
              )}
            </ToolbarButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 px-2 text-xs"
              onMouseDown={(e) => e.preventDefault()}
              onClick={insertImageByUrl}
            >
              Image URL
            </Button>
          </>
        ) : null}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
