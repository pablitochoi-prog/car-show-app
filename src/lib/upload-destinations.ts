export type UploadPurpose =
  | "privateVehiclePhoto"
  | "privateProfilePhoto"
  | "publicVehicleDisplayPhoto"
  | "eventFlyer"
  | "eventLogo"
  | "eventGalleryPhoto"
  | "clubLogo"
  | "organizerLogo"
  | "sponsorLogo"
  | "platformSponsorLogo"
  | "dashCardImage"
  | "privateDocument"
  | "importRawFile";

type KeyPrefixArgs = {
  userId?: string;
  vehicleId?: string;
  eventId?: string;
  clubId?: string;
  organizerId?: string;
  sponsorId?: string;
  importJobId?: string;
};

type UploadDestination = {
  visibility: "public" | "private";
  bucketType: "publicPhotos" | "privateAssets";
  requiredFields: Array<keyof KeyPrefixArgs>;
  keyPrefix: (args: KeyPrefixArgs) => string;
};

export const uploadDestinations: Record<UploadPurpose, UploadDestination> = {
  privateVehiclePhoto: {
    visibility: "private",
    bucketType: "privateAssets",
    requiredFields: ["vehicleId"],
    keyPrefix: ({ userId, vehicleId }) =>
      `vehicle-photos/${userId}/${vehicleId}`,
  },

  privateProfilePhoto: {
    visibility: "private",
    bucketType: "privateAssets",
    requiredFields: ["userId"],
    keyPrefix: ({ userId }) => `profile-photos/${userId}`,
  },

  publicVehicleDisplayPhoto: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["eventId", "vehicleId"],
    keyPrefix: ({ eventId, vehicleId }) =>
      `events/${eventId}/vehicles/${vehicleId}/display`,
  },

  eventFlyer: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["eventId"],
    keyPrefix: ({ eventId }) => `events/${eventId}/flyers`,
  },

  eventLogo: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["eventId"],
    keyPrefix: ({ eventId }) => `events/${eventId}/logos`,
  },

  eventGalleryPhoto: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["eventId"],
    keyPrefix: ({ eventId }) => `events/${eventId}/gallery`,
  },

  clubLogo: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["clubId"],
    keyPrefix: ({ clubId }) => `clubs/${clubId}/logos`,
  },

  organizerLogo: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["organizerId"],
    keyPrefix: ({ organizerId }) => `organizers/${organizerId}/logos`,
  },

  sponsorLogo: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["sponsorId"],
    keyPrefix: ({ sponsorId }) => `sponsors/${sponsorId}/logos`,
  },

  platformSponsorLogo: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: [],
    keyPrefix: () => "platform/sponsor",
  },

  dashCardImage: {
    visibility: "public",
    bucketType: "publicPhotos",
    requiredFields: ["eventId", "vehicleId"],
    keyPrefix: ({ eventId, vehicleId }) =>
      `dash-cards/${eventId}/${vehicleId}`,
  },

  privateDocument: {
    visibility: "private",
    bucketType: "privateAssets",
    requiredFields: ["userId"],
    keyPrefix: ({ userId }) => `users/${userId}/documents`,
  },

  importRawFile: {
    visibility: "private",
    bucketType: "privateAssets",
    requiredFields: ["importJobId"],
    keyPrefix: ({ importJobId }) => `imports/${importJobId}/raw`,
  },
};

export function getUploadDestination(uploadPurpose: UploadPurpose) {
  return uploadDestinations[uploadPurpose];
}

export function isValidUploadPurpose(value: string): value is UploadPurpose {
  return value in uploadDestinations;
}

export function validateRequiredUploadFields(
  uploadPurpose: UploadPurpose,
  args: KeyPrefixArgs
) {
  const destination = getUploadDestination(uploadPurpose);

  const missingFields = destination.requiredFields.filter((field) => {
    return !args[field];
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}