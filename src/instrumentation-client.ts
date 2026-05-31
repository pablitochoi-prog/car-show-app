import * as Sentry from "@sentry/nextjs";
import { buildSentryInitOptions } from "@/lib/sentry-observability";

Sentry.init(buildSentryInitOptions());
