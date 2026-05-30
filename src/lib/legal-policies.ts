import { prisma } from "@/lib/db";
import { DEFAULT_SMS_TEXT_POLICY_HTML } from "@/lib/legal-policy-defaults";
import {
  isPolicyHtmlEmpty,
  sanitizePolicyHtml,
} from "@/lib/sanitize-policy-html";

export const LEGAL_POLICIES_SETTING_KEY = "legal_policies";

export type LegalPolicies = {
  smsTextPolicyHtml: string | null;
  privacyPolicyHtml: string | null;
};

const DEFAULT: LegalPolicies = {
  smsTextPolicyHtml: null,
  privacyPolicyHtml: null,
};

function parseValue(raw: unknown): LegalPolicies {
  if (!raw || typeof raw !== "object") return { ...DEFAULT };
  const v = raw as Record<string, unknown>;
  const sms =
    typeof v.smsTextPolicyHtml === "string" ? v.smsTextPolicyHtml : null;
  const privacy =
    typeof v.privacyPolicyHtml === "string" ? v.privacyPolicyHtml : null;
  return {
    smsTextPolicyHtml:
      sms && !isPolicyHtmlEmpty(sms) ? sanitizePolicyHtml(sms) : null,
    privacyPolicyHtml:
      privacy && !isPolicyHtmlEmpty(privacy)
        ? sanitizePolicyHtml(privacy)
        : null,
  };
}

export async function getLegalPolicies(): Promise<LegalPolicies> {
  const row = await prisma.globalSetting.findUnique({
    where: { key: LEGAL_POLICIES_SETTING_KEY },
  });
  if (!row) {
    const initial: LegalPolicies = {
      smsTextPolicyHtml: DEFAULT_SMS_TEXT_POLICY_HTML,
      privacyPolicyHtml: null,
    };
    await prisma.globalSetting.upsert({
      where: { key: LEGAL_POLICIES_SETTING_KEY },
      update: {},
      create: { key: LEGAL_POLICIES_SETTING_KEY, value: initial },
    });
    return initial;
  }
  if (!row.value) return { ...DEFAULT };
  return parseValue(row.value);
}

export async function getSmsTextPolicyHtml(): Promise<string | null> {
  const policies = await getLegalPolicies();
  return policies.smsTextPolicyHtml;
}

export async function getPrivacyPolicyHtml(): Promise<string | null> {
  const policies = await getLegalPolicies();
  return policies.privacyPolicyHtml;
}

/** HTML prefill for the SMS policy admin editor. */
export function getDefaultSmsTextPolicyHtml(): string {
  return DEFAULT_SMS_TEXT_POLICY_HTML;
}

export async function saveLegalPolicies(
  patch: Partial<LegalPolicies>,
): Promise<LegalPolicies> {
  const current = await getLegalPolicies();
  const next: LegalPolicies = {
    smsTextPolicyHtml:
      patch.smsTextPolicyHtml !== undefined
        ? normalizeStoredHtml(patch.smsTextPolicyHtml)
        : current.smsTextPolicyHtml,
    privacyPolicyHtml:
      patch.privacyPolicyHtml !== undefined
        ? normalizeStoredHtml(patch.privacyPolicyHtml)
        : current.privacyPolicyHtml,
  };

  await prisma.globalSetting.upsert({
    where: { key: LEGAL_POLICIES_SETTING_KEY },
    update: { value: next },
    create: { key: LEGAL_POLICIES_SETTING_KEY, value: next },
  });

  return next;
}

function normalizeStoredHtml(html: string | null): string | null {
  if (html == null) return null;
  const sanitized = sanitizePolicyHtml(html);
  if (isPolicyHtmlEmpty(sanitized)) return null;
  return sanitized;
}
