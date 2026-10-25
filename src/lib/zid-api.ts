import type { ZidConnection } from "@prisma/client";
import { decryptSecret } from "@/lib/token-crypto";
import type { ZidOrderPayload } from "@/lib/zid";

const ZID_API_BASE = "https://api.zid.sa/v1";
const REQUEST_TIMEOUT_MS = 15000;

export class ZidApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ZidApiError";
  }
}

function buildHeaders(connection: ZidConnection): HeadersInit {
  return {
    Authorization: `Bearer ${decryptSecret(connection.authorizationToken)}`,
    "X-Manager-Token": decryptSecret(connection.managerToken),
    "Accept-Language": "en",
    Accept: "application/json",
  };
}

async function zidGet<T>(
  connection: ZidConnection,
  path: string,
  query: Record<string, string>
): Promise<T> {
  const url = new URL(`${ZID_API_BASE}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: buildHeaders(connection),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    // Never include the response headers or tokens in the error.
    throw new ZidApiError(`Zid API ${path} responded with ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

// Fetches a single order straight from Zid so webhook payloads (which are not
// signed) are never trusted as the source of truth.
export async function fetchZidOrder(
  connection: ZidConnection,
  orderId: string
): Promise<ZidOrderPayload | null> {
  const data = await zidGet<{ orders?: ZidOrderPayload[] }>(connection, "/managers/store/orders", {
    order_id: orderId,
    payload_type: "default",
    page: "1",
    per_page: "1",
  });

  const order = data.orders?.find((o) => String(o.id) === orderId);
  return order ?? null;
}
