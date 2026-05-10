-- Key-value store for site-wide admin settings
CREATE TABLE "global_settings" (
    "key"       TEXT NOT NULL,
    "value"     JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("key")
);
