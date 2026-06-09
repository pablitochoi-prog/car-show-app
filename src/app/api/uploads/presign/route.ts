import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { User } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  canManageEvent,
  getCurrentUser,
  getOrgMembership,
} from "@/lib/auth";
import { isSiteAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import {
  privateAssetsR2,
  publicPhotosR2,
  r2Buckets,
  r2PublicUrls,
} from "@/lib/r2";
import {
  isValidUploadPurpose,
  uploadDestinations,
  validateRequiredUploadFields,
  type UploadPurpose,
} from "@/lib/upload-destinations";
import {
  canAccessVehicle,
  GARAGE_PHOTO_CONTENT_TYPES,
  GARAGE_PHOTO_MAX_BYTES,
  userOwnsVehicle,
} from "@/lib/vehicle-photo-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRESIGN_EXPIRES_SECONDS = 15 * 60;

const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const FLYER_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  "application/pdf",
]);

const DOCUMENT_CONTENT_TYPES = new Set([
  ...IMAGE_CONTENT_TYPES,
  "application/pdf",
  "text/plain",
  "text/csv",
]);

const IMPORT_CONTENT_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/json",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const IMPORT_MAX_BYTES = 32 * 1024 * 1024;

type PresignBody = {
  uploadPurpose?: unknown;
  filename?: unknown;
  contentType?: unknown;
  sizeBytes?: unknown;
  userId?: unknown;
  vehicleId?: unknown;
  eventId?: unknown;
  clubId?: unknown;
  organizerId?: unknown;
  sponsorId?: unknown;
  listingId?: unknown;
  importJobId?: unknown;
};

type KeyPrefixArgs = {
  userId?: string;
  vehicleId?: string;
  eventId?: string;
  clubId?: string;
  organizerId?: string;
  sponsorId?: string;
  listingId?: string;
  importJobId?: string;
};

function allowedContentTypesForPurpose(purpose: UploadPurpose): Set<string> {
  if (purpose === "privateVehiclePhoto") return GARAGE_PHOTO_CONTENT_TYPES;
  switch (purpose) {
    case "eventFlyer":
      return FLYER_CONTENT_TYPES;
    case "privateDocument":
      return DOCUMENT_CONTENT_TYPES;
    case "importRawFile":
      return IMPORT_CONTENT_TYPES;
    default:
      return IMAGE_CONTENT_TYPES;
  }
}

function maxBytesForPurpose(purpose: UploadPurpose): number {
  if (purpose === "privateVehiclePhoto") return GARAGE_PHOTO_MAX_BYTES;
  return purpose === "importRawFile" ? IMPORT_MAX_BYTES : DEFAULT_MAX_BYTES;
}

function extensionFromFilename(filename: string, contentType: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  if (/^[a-z0-9]{2,5}$/.test(raw)) return raw;

  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "text/csv": "csv",
    "text/plain": "txt",
    "application/json": "json",
  };

  return byType[contentType] ?? "bin";
}

function parseStringField(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseSizeBytes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

const ORGANIZER_EVENT_PURPOSES = new Set<UploadPurpose>([
  "eventFlyer",
  "eventLogo",
  "eventGalleryPhoto",
  "sponsorLogo",
]);

const VEHICLE_EVENT_PURPOSES = new Set<UploadPurpose>([
  "publicVehicleDisplayPhoto",
  "dashCardImage",
]);

async function resolveKeyArgs(
  purpose: UploadPurpose,
  body: PresignBody,
  currentUser: Pick<User, "id" | "platformRole">,
): Promise<{ keyArgs: KeyPrefixArgs | null; error: string | null; status: number }> {
  if (purpose === "privateVehiclePhoto") {
    const vehicleId = parseStringField(body.vehicleId);
    if (!vehicleId) {
      return {
        keyArgs: null,
        error: "vehicleId is required",
        status: 400,
      };
    }

    const allowed = await canAccessVehicle(currentUser, vehicleId);
    if (!allowed) {
      return { keyArgs: null, error: "Forbidden", status: 403 };
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { userId: true },
    });
    if (!vehicle) {
      return { keyArgs: null, error: "Vehicle not found", status: 404 };
    }

    return {
      keyArgs: { userId: vehicle.userId, vehicleId },
      error: null,
      status: 200,
    };
  }

  const keyArgs: KeyPrefixArgs = {
    userId: parseStringField(body.userId),
    vehicleId: parseStringField(body.vehicleId),
    eventId: parseStringField(body.eventId),
    clubId: parseStringField(body.clubId),
    organizerId: parseStringField(body.organizerId),
    sponsorId: parseStringField(body.sponsorId),
    listingId: parseStringField(body.listingId),
    importJobId: parseStringField(body.importJobId),
  };

  const required = validateRequiredUploadFields(purpose, keyArgs);
  if (!required.valid) {
    return {
      keyArgs: null,
      error: `Missing required fields: ${required.missingFields.join(", ")}`,
      status: 400,
    };
  }

  return { keyArgs, error: null, status: 200 };
}

async function authorizeUpload(
  purpose: UploadPurpose,
  args: KeyPrefixArgs,
  currentUserId: string,
  platformRole: string | undefined,
): Promise<string | null> {
  // --- Per-purpose explicit authorization (deny-by-default at end) ---

  if (purpose === "privateVehiclePhoto") {
    // Ownership checked in resolveKeyArgs via canAccessVehicle.
    return null;
  }

  if (purpose === "privateProfilePhoto" || purpose === "privateDocument") {
    // Must be uploading for yourself.
    if (!args.userId || args.userId !== currentUserId) return "Forbidden";
    return null;
  }

  if (purpose === "organizerLogo") {
    if (!args.organizerId || args.organizerId !== currentUserId) return "Forbidden";
    return null;
  }

  if (purpose === "clubLogo") {
    if (!args.clubId) return "Missing clubId";
    const membership = await getOrgMembership(currentUserId, args.clubId);
    if (!membership) return "Forbidden";
    return null;
  }

  if (purpose === "platformSponsorLogo") {
    // Platform-wide asset: restricted to site admins only.
    if (!isSiteAdmin({ platformRole: (platformRole ?? "USER") as never })) {
      return "Forbidden";
    }
    return null;
  }

  if (ORGANIZER_EVENT_PURPOSES.has(purpose)) {
    const eventId = args.eventId ?? args.sponsorId;
    if (!eventId) return "Missing eventId";
    const allowed = await canManageEvent(currentUserId, eventId, undefined, platformRole);
    if (!allowed) return "Forbidden";
    return null;
  }

  if (VEHICLE_EVENT_PURPOSES.has(purpose)) {
    if (!args.eventId || !args.vehicleId) return "Missing eventId or vehicleId";
    const managesEvent = await canManageEvent(currentUserId, args.eventId, undefined, platformRole);
    const ownsVehicle = await userOwnsVehicle(currentUserId, args.vehicleId);
    if (!managesEvent && !ownsVehicle) return "Forbidden";
    return null;
  }

  if (purpose === "vehicleSalePhoto") {
    // Must be event manager OR owner of the listing/registration.
    if (!args.eventId || !args.listingId) return "Missing eventId or listingId";
    const managesEvent = await canManageEvent(currentUserId, args.eventId, undefined, platformRole);
    if (managesEvent) return null;

    const listing = await prisma.vehicleSaleListing.findFirst({
      where: { id: args.listingId, eventId: args.eventId },
      select: { sellerUserId: true, registration: { select: { userId: true } } },
    });
    if (!listing) return "Listing not found";
    const ownsListing =
      listing.sellerUserId === currentUserId ||
      listing.registration?.userId === currentUserId;
    if (!ownsListing) return "Forbidden";
    return null;
  }

  if (purpose === "importRawFile") {
    // Server-generated importJobId; any authenticated user may upload.
    // The importJobId is validated as present by validateRequiredUploadFields.
    return null;
  }

  // Deny-by-default: any purpose not explicitly handled above is forbidden.
  return "Forbidden";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PresignBody;
  try {
    body = (await request.json()) as PresignBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const uploadPurposeRaw =
    typeof body.uploadPurpose === "string" ? body.uploadPurpose.trim() : "";
  if (!isValidUploadPurpose(uploadPurposeRaw)) {
    return NextResponse.json({ error: "Invalid uploadPurpose" }, { status: 400 });
  }
  const uploadPurpose = uploadPurposeRaw;

  const filename = parseStringField(body.filename);
  const contentType = parseStringField(body.contentType);
  const sizeBytes = parseSizeBytes(body.sizeBytes);

  if (!filename) {
    return NextResponse.json({ error: "filename is required" }, { status: 400 });
  }
  if (!contentType) {
    return NextResponse.json(
      { error: "contentType is required" },
      { status: 400 },
    );
  }
  if (sizeBytes === null || sizeBytes <= 0) {
    return NextResponse.json(
      { error: "sizeBytes must be a positive number" },
      { status: 400 },
    );
  }

  const allowedTypes = allowedContentTypesForPurpose(uploadPurpose);
  if (!allowedTypes.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported contentType for this uploadPurpose" },
      { status: 400 },
    );
  }

  const maxBytes = maxBytesForPurpose(uploadPurpose);
  if (sizeBytes > maxBytes) {
    return NextResponse.json(
      {
        error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`,
      },
      { status: 400 },
    );
  }

  const resolved = await resolveKeyArgs(uploadPurpose, body, user);
  if (!resolved.keyArgs) {
    return NextResponse.json(
      { error: resolved.error ?? "Invalid upload request" },
      { status: resolved.status },
    );
  }
  const keyArgs = resolved.keyArgs;

  const authError = await authorizeUpload(
    uploadPurpose,
    keyArgs,
    user.id,
    user.platformRole,
  );
  if (authError === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (authError) {
    return NextResponse.json({ error: authError }, { status: 400 });
  }

  const destination = uploadDestinations[uploadPurpose];
  const extension = extensionFromFilename(filename, contentType);
  const objectKey = `${destination.keyPrefix(keyArgs)}/${crypto.randomUUID()}.${extension}`;

  const isPublic = destination.bucketType === "publicPhotos";
  const client = isPublic ? publicPhotosR2 : privateAssetsR2;
  const bucket = isPublic ? r2Buckets.publicPhotos : r2Buckets.privateAssets;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  let uploadUrl: string;
  try {
    uploadUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGN_EXPIRES_SECONDS,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const response: {
    uploadUrl: string;
    bucket: string;
    objectKey: string;
    visibility: "public" | "private";
    publicUrl?: string;
  } = {
    uploadUrl,
    bucket,
    objectKey,
    visibility: destination.visibility,
  };

  if (destination.visibility === "public") {
    const key = objectKey.replace(/^\//, "");
    response.publicUrl = `${r2PublicUrls.publicPhotos}/${key}`;
  }

  return NextResponse.json(response);
}
