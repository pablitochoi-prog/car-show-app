import { describe, expect, it } from "vitest";
import {
  getSpeechDictationBlocker,
  isSpeechDictationSupported,
  speechDictationErrorMessage,
} from "@/lib/speech-dictation";

describe("speech-dictation", () => {
  it("maps error codes to user-facing messages", () => {
    expect(speechDictationErrorMessage("not-allowed")).toContain("macOS");
    expect(speechDictationErrorMessage("speech-blocked")).toContain("Chrome");
    expect(speechDictationErrorMessage("aborted")).toBe("");
  });

  it("reports unsupported when Web Speech API is missing", () => {
    expect(isSpeechDictationSupported()).toBe(false);
    expect(getSpeechDictationBlocker()).toBe("unsupported");
  });

  it("maps insecure context message", () => {
    expect(speechDictationErrorMessage("insecure")).toContain("HTTPS");
  });
});
