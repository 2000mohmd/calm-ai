import { afterEach, describe, expect, it, vi } from "vitest";
import {
  billingEnabled,
  clearPaymentProviders,
  getPaymentProvider,
  registerPaymentProvider,
  type PaymentProvider,
} from "./provider";

const fake: PaymentProvider = {
  id: "fake",
  createCheckout: async () => ({ url: "https://pay.test/c" }),
  parseWebhook: async () => [],
};

afterEach(() => {
  vi.unstubAllEnvs();
  clearPaymentProviders();
});

describe("payment provider registry", () => {
  it("is disabled by default", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "");
    expect(getPaymentProvider()).toBeNull();
    expect(billingEnabled()).toBe(false);
  });

  it("is disabled when PAYMENT_PROVIDER names an unknown gateway", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "nope");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getPaymentProvider()).toBeNull();
    expect(billingEnabled()).toBe(false);
  });

  it("returns a registered gateway (case-insensitive) and enables billing", () => {
    registerPaymentProvider("fake", () => fake);
    vi.stubEnv("PAYMENT_PROVIDER", " FAKE ");
    expect(getPaymentProvider()).toBe(fake);
    expect(billingEnabled()).toBe(true);
  });

  it("stays disabled when a gateway is registered but not selected", () => {
    registerPaymentProvider("fake", () => fake);
    vi.stubEnv("PAYMENT_PROVIDER", "");
    expect(billingEnabled()).toBe(false);
  });
});
