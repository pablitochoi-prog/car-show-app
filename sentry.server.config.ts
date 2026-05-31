import * as Sentry from "@sentry/nextjs";
import { buildSentryInitOptions } from "./src/lib/sentry-observability";

Sentry.init(buildSentryInitOptions());
