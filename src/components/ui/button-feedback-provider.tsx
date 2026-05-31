"use client";

import { useEffect } from "react";
import {
  BUTTON_CLICK_SOUND_SRC,
  BUTTON_CLICK_SOUND_VOLUME,
  BUTTON_HAPTIC_MS,
  BUTTON_PRESSED_MS,
  ENABLE_BUTTON_CLICK_SOUND,
} from "@/lib/button-feedback-config";
import {
  BUTTON_FEEDBACK_PRESSED_CLASS,
  findButtonFeedbackTarget,
} from "@/lib/button-feedback-target";

const ACTIVATION_KEYS = new Set(["Enter", " ", "Spacebar"]);

type PressTimer = ReturnType<typeof setTimeout>;

/**
 * Global delegated press feedback: scale/opacity, optional click sound, and haptic.
 * Mount once near the app root.
 */
export function ButtonFeedbackProvider() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let clickAudio: HTMLAudioElement | null = null;
    let userHasActivated = false;
    let lastPointerType: string | undefined;
    const pressedTimers = new WeakMap<HTMLElement, PressTimer>();

    function ensureAudio(): HTMLAudioElement | null {
      if (!ENABLE_BUTTON_CLICK_SOUND) return null;
      if (!userHasActivated) return null;
      if (!clickAudio) {
        clickAudio = new Audio(BUTTON_CLICK_SOUND_SRC);
        clickAudio.preload = "auto";
        clickAudio.volume = BUTTON_CLICK_SOUND_VOLUME;
      }
      return clickAudio;
    }

    function markUserActivated() {
      userHasActivated = true;
      ensureAudio();
    }

    function clearPressed(el: HTMLElement) {
      el.classList.remove(BUTTON_FEEDBACK_PRESSED_CLASS);
      const timer = pressedTimers.get(el);
      if (timer) {
        clearTimeout(timer);
        pressedTimers.delete(el);
      }
    }

    function applyPressed(el: HTMLElement) {
      el.classList.add(BUTTON_FEEDBACK_PRESSED_CLASS);

      const existing = pressedTimers.get(el);
      if (existing) clearTimeout(existing);

      pressedTimers.set(
        el,
        setTimeout(() => {
          clearPressed(el);
        }, BUTTON_PRESSED_MS),
      );
    }

    function triggerHaptic(pointerType: string | undefined) {
      if (pointerType && pointerType !== "touch") return;
      try {
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(BUTTON_HAPTIC_MS);
        }
      } catch {
        // iOS Safari and other browsers may not support vibration.
      }
    }

    function playClickSound() {
      if (!ENABLE_BUTTON_CLICK_SOUND || !userHasActivated) return;
      const audio = ensureAudio();
      if (!audio) return;

      try {
        audio.currentTime = 0;
        const playPromise = audio.play();
        if (playPromise) {
          void playPromise.catch(() => {
            // Autoplay policies or missing asset — ignore silently.
          });
        }
      } catch {
        // Ignore playback errors.
      }
    }

    function onPointerDown(event: PointerEvent) {
      markUserActivated();
      lastPointerType = event.pointerType;
      const target = findButtonFeedbackTarget(event.target);
      if (!target) return;

      applyPressed(target);
    }

    function onPointerUpOrCancel(event: PointerEvent) {
      const target = findButtonFeedbackTarget(event.target);
      if (target) clearPressed(target);
    }

    function onClick(event: MouseEvent) {
      markUserActivated();
      const target = findButtonFeedbackTarget(event.target);
      if (!target) return;

      playClickSound();
      triggerHaptic(lastPointerType);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.repeat) return;
      if (!ACTIVATION_KEYS.has(event.key)) return;

      markUserActivated();
      const target = findButtonFeedbackTarget(event.target);
      if (!target) return;

      applyPressed(target);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (!ACTIVATION_KEYS.has(event.key)) return;
      const target = findButtonFeedbackTarget(event.target);
      if (!target) return;
      clearPressed(target);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUpOrCancel, true);
    document.addEventListener("pointercancel", onPointerUpOrCancel, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUpOrCancel, true);
      document.removeEventListener("pointercancel", onPointerUpOrCancel, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  return null;
}
