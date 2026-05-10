-- CreateIndex
CREATE INDEX IF NOT EXISTS "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "events_orgId_idx" ON "events"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicles_userId_idx" ON "vehicles"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "registrations_userId_idx" ON "registrations"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "event_staff_userId_idx" ON "event_staff"("userId");
