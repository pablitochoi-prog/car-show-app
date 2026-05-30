import { afterEach, describe, expect, it } from "vitest";
import { getSiteOrigin } from "@/lib/site-url";

describe("getSiteOrigin", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://events.carshowscout.com/";
    expect(getSiteOrigin()).toBe("https://events.carshowscout.com");
  });

  it("defaults to localhost in development without env", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NODE_ENV = "development";
    expect(getSiteOrigin()).toBe("http://localhost:3000");
  });

  it("defaults to production host in production without env", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    process.env.NODE_ENV = "production";
    expect(getSiteOrigin()).toBe("https://events.carshowscout.com");
  });
});
