"use client";

import useSWR, { mutate as globalMutate } from "swr";
import {
  EVENT_SETUP_STALE_MS,
  eventApiKeys,
} from "@/lib/event-api-cache-keys";

const swrOptions = {
  dedupingInterval: EVENT_SETUP_STALE_MS,
  revalidateOnFocus: false,
} as const;

export type EventCategoryRow = {
  id: string;
  categoryId: string | null;
  name: string;
  trophyCount: number;
  isCustom: boolean;
};

export type MasterCategory = {
  id: string;
  name: string;
  groupName: string | null;
};

export function useEventSponsor(eventId: string) {
  return useSWR(eventApiKeys.sponsor(eventId), swrOptions);
}

export function useEventCharity(eventId: string) {
  return useSWR(eventApiKeys.charity(eventId), swrOptions);
}

export function useEventCategories(eventId: string) {
  return useSWR<{ categories: EventCategoryRow[] }>(
    eventApiKeys.categories(eventId),
    swrOptions,
  );
}

export function useEventAvailableCategories(eventId: string, enabled = true) {
  return useSWR<{
    categories: MasterCategory[];
    masterCount: number;
  }>(enabled ? eventApiKeys.availableCategories(eventId) : null, swrOptions);
}

export function useEventAwards(eventId: string) {
  return useSWR(eventApiKeys.awards(eventId), swrOptions);
}

export function useMasterAwards() {
  return useSWR(eventApiKeys.masterAwards(), swrOptions);
}

export async function invalidateEventCategories(eventId: string) {
  await Promise.all([
    globalMutate(eventApiKeys.categories(eventId)),
    globalMutate(eventApiKeys.availableCategories(eventId)),
  ]);
}

export async function setEventCategoriesCache(
  eventId: string,
  categories: EventCategoryRow[],
) {
  await globalMutate(
    eventApiKeys.categories(eventId),
    { categories },
    { revalidate: false },
  );
  await globalMutate(eventApiKeys.availableCategories(eventId));
}

export type EventAwardRow = {
  id: string;
  specialAwardId: string | null;
  name: string;
  isCustom: boolean;
  requiresSpecialJudge?: boolean;
  assignedSpecialJudgeUserIds?: string[];
  ballotCategoryId?: string | null;
};

export type SpecialJudgeStaffOption = {
  userId: string;
  name: string;
  email: string;
};

export type EventAwardsCachePayload = {
  awards: EventAwardRow[];
  specialJudgeStaff?: SpecialJudgeStaffOption[];
};

export async function setEventAwardsCache(
  eventId: string,
  awards: EventAwardRow[],
  specialJudgeStaff?: SpecialJudgeStaffOption[],
) {
  await globalMutate(
    eventApiKeys.awards(eventId),
    (current: EventAwardsCachePayload | undefined) => ({
      awards,
      specialJudgeStaff:
        specialJudgeStaff ?? current?.specialJudgeStaff ?? [],
    }),
    { revalidate: false },
  );
}

export async function revalidateEventAwards(eventId: string) {
  await globalMutate(eventApiKeys.awards(eventId));
}
