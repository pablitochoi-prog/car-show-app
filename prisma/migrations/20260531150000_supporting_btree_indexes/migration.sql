-- Phase 2 (P1-6): additive btree indexes for registration, messaging, and dashboard hot paths

CREATE INDEX "registration_vehicles_registrationId_idx" ON "registration_vehicles"("registrationId");

CREATE INDEX "registrations_eventId_status_idx" ON "registrations"("eventId", "status");

CREATE INDEX "messages_recipientUserId_createdAt_idx" ON "messages"("recipientUserId", "createdAt" DESC);

CREATE INDEX "event_staff_members_userId_idx" ON "event_staff_members"("userId");

CREATE INDEX "vehicle_sale_inquiries_eventId_status_idx" ON "vehicle_sale_inquiries"("eventId", "status");
