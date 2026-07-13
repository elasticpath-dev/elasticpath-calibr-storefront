import type { Client } from "@hey-api/client-fetch";

// Quote API — mirrors the EP Cart API but at /v2/quotes instead of /v2/carts.
// Not yet part of the SDK so calls are made directly via the hey-api client.

const BEARER = [{ scheme: "bearer", type: "http" }] as const;
const JSON_CT = { "Content-Type": "application/json" } as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type QuoteAddress = {
  first_name: string;
  last_name: string;
  company_name?: string;
  line_1: string;
  line_2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  region?: string;
  phone_number?: string;
};

export type QuoteContact = {
  name: string;
  email: string;
};

export type CustomAttribute = {
  type: "string" | "integer" | "boolean" | "float";
  value: string;
};

export type CreateQuotePayload = {
  type: "quote";
  name: string;
  description?: string;
  contact?: QuoteContact;
  shipping_address?: QuoteAddress;
  billing_address?: QuoteAddress;
  custom_attributes?: Record<string, CustomAttribute>;
};

export type QuoteItemPayload =
  | {
      type: "quote_item" | "subscription_item";
      id: string;
      quantity: number;
      subscription_configuration?: { plan: string; pricing_option: string };
      custom_inputs?: Record<string, unknown>;
    }
  | {
      type: "custom_item";
      name: string;
      sku: string;
      quantity: number;
      price: { amount: number; includes_tax: boolean };
      custom_inputs?: Record<string, unknown>;
    };

export type QuoteResponse = {
  data: {
    id: string;
    type: string;
    name?: string;
    [key: string]: unknown;
  };
};

// ── API functions ─────────────────────────────────────────────────────────────

export function createQuote(options: {
  client: Client;
  body: { data: CreateQuotePayload };
  headers?: Record<string, string>;
}) {
  return options.client.post({
    ...options,
    headers: { ...JSON_CT, ...options.headers },
    security: BEARER,
    url: "/v2/quotes",
  });
}

export function getQuote(options: {
  client: Client;
  path: { quoteId: string };
}) {
  return options.client.get({
    ...options,
    security: BEARER,
    url: "/v2/quotes/{quoteId}",
  });
}

export function getQuotes(options: { client: Client }) {
  return options.client.get({
    ...options,
    security: BEARER,
    url: "/v2/quotes",
  });
}

export function bulkAddQuoteItems(options: {
  client: Client;
  path: { quoteId: string };
  body: { data: QuoteItemPayload[] };
  headers?: Record<string, string>;
}) {
  return options.client.post({
    ...options,
    headers: { ...JSON_CT, ...options.headers },
    security: BEARER,
    url: "/v2/quotes/{quoteId}/items",
  });
}

export function getQuoteItems(options: {
  client: Client;
  path: { quoteId: string };
}) {
  return options.client.get({
    ...options,
    security: BEARER,
    url: "/v2/quotes/{quoteId}/items",
  });
}

export function deleteQuote(options: {
  client: Client;
  path: { quoteId: string };
}) {
  return options.client.delete({
    ...options,
    security: BEARER,
    url: "/v2/quotes/{quoteId}",
  });
}
