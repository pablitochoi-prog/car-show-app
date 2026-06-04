/** Browser speech-to-text for judge note dictation (Web Speech API). */

export type SpeechDictationErrorCode =
  | "unsupported"
  | "not-allowed"
  | "insecure"
  | "no-device"
  | "no-speech"
  | "network"
  | "speech-blocked"
  | "aborted"
  | "unknown";

export function speechDictationErrorMessage(
  code: SpeechDictationErrorCode,
  context?: { host?: string },
): string {
  const hostHint = context?.host ? ` (${context.host})` : "";

  switch (code) {
    case "unsupported":
      return "Dictation is not supported in this browser. Open the scorecard in Google Chrome, or type your note.";
    case "not-allowed":
      return [
        `This website${hostHint} does not have microphone access yet — that is separate from allowing Chrome in macOS System Settings.`,
        "In Chrome: click the icon to the left of the address bar (tune or lock) → Site settings → Microphone → Allow.",
        "Reload this page, open the note again, and tap Dictate.",
      ].join(" ");
    case "speech-blocked":
      return [
        "Chrome allowed the microphone, but speech recognition was blocked for this page.",
        "Reset site permissions (address bar → Site settings → Reset permissions), allow Microphone, reload, and try again.",
        "If you are not using Google Chrome, open the scorecard in Chrome for dictation.",
      ].join(" ");
    case "insecure":
      return "Dictation requires HTTPS (or localhost). Open the app over a secure URL and try again.";
    case "no-device":
      return "No microphone was found. Connect a mic or use a device with a built-in microphone.";
    case "no-speech":
      return "No speech was detected. Try again and speak clearly.";
    case "network":
      return "Dictation needs an internet connection (Chrome sends audio to Google's speech service).";
    case "aborted":
      return "";
    default:
      return "Dictation could not start. Try again or type your note.";
  }
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function isSpeechDictationSupported(): boolean {
  return getSpeechRecognitionConstructor() != null;
}

function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognitionInstance)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function getSpeechDictationBlocker(): SpeechDictationErrorCode | null {
  if (typeof window === "undefined") return "unsupported";
  if (!getSpeechRecognitionConstructor()) return "unsupported";
  if (!window.isSecureContext) return "insecure";
  return null;
}

/** Browser-reported microphone permission for this origin (when supported). */
export async function getMicrophonePermissionState(): Promise<
  PermissionState | "unsupported"
> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    return status.state;
  } catch {
    return "unsupported";
  }
}

/**
 * Prompt for site-level microphone access on the user's click (must be awaited
 * in the click handler before starting speech recognition).
 */
export async function requestMicrophoneForDictation(): Promise<
  { ok: true } | { ok: false; code: SpeechDictationErrorCode }
> {
  if (typeof window === "undefined") {
    return { ok: false, code: "unsupported" };
  }
  if (!window.isSecureContext) {
    return { ok: false, code: "insecure" };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, code: "unsupported" };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return { ok: false, code: "not-allowed" };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { ok: false, code: "no-device" };
    }
    if (name === "SecurityError") {
      return { ok: false, code: "insecure" };
    }
    return { ok: false, code: "unknown" };
  }
}

export type SpeechDictationSession = {
  stop: () => void;
};

/**
 * Start speech recognition after microphone access succeeded.
 */
export function startSpeechDictationHandlers(handlers: {
  onTranscript: (text: string, isFinal: boolean) => void;
  onListeningChange: (listening: boolean) => void;
  onError: (code: SpeechDictationErrorCode) => void;
  /** Mic already granted via getUserMedia — map recognition errors accordingly. */
  microphoneGranted?: boolean;
}): SpeechDictationSession | null {
  const blocker = getSpeechDictationBlocker();
  if (blocker) {
    handlers.onError(blocker);
    return null;
  }

  const Ctor = getSpeechRecognitionConstructor()!;
  const recognition = new Ctor();
  let sessionActive = true;
  let heardResult = false;

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    handlers.onListeningChange(true);
  };

  recognition.onresult = (event) => {
    if (!sessionActive) return;
    heardResult = true;

    let interim = "";
    let finalChunk = "";

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const text = result?.[0]?.transcript?.trim() ?? "";
      if (!text) continue;
      if (result.isFinal) finalChunk += `${text} `;
      else interim += `${text} `;
    }

    if (finalChunk.trim()) {
      handlers.onTranscript(finalChunk.trim(), true);
    } else if (interim.trim()) {
      handlers.onTranscript(interim.trim(), false);
    }
  };

  recognition.onerror = (event) => {
    if (!sessionActive) return;
    const code = mapSpeechError(event.error, handlers.microphoneGranted === true);
    if (code !== "aborted") handlers.onError(code);
    sessionActive = false;
    handlers.onListeningChange(false);
  };

  recognition.onend = () => {
    if (!sessionActive) return;
    sessionActive = false;
    handlers.onListeningChange(false);
    if (!heardResult) {
      /* onend without onerror often means silent failure after not-allowed */
    }
  };

  try {
    recognition.start();
  } catch {
    handlers.onError("unknown");
    return null;
  }

  return {
    stop() {
      sessionActive = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
      }
      handlers.onListeningChange(false);
    },
  };
}

function mapSpeechError(
  error: string,
  microphoneGranted: boolean,
): SpeechDictationErrorCode {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return microphoneGranted ? "speech-blocked" : "not-allowed";
  }
  if (error === "no-speech") return "no-speech";
  if (error === "network") return "network";
  if (error === "aborted") return "aborted";
  if (error === "audio-capture") return microphoneGranted ? "speech-blocked" : "not-allowed";
  return "unknown";
}
