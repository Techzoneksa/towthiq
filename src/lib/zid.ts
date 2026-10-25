import { normalizeArabicDigits, normalizeEmail, normalizePhone, isValidEmail } from "@/lib/import-helpers";

// Subset of the Zid order object we rely on. Zid sends the same shape in
// webhook payloads and in GET /managers/store/orders (payload_type=default).
export interface ZidOrderPayload {
  id: number | string;
  code?: string | null;
  invoice_number?: string | null;
  store_id?: number | string | null;
  order_status?: { code?: string | null; name?: string | null } | string | null;
  payment_status?: string | null;
  customer?: {
    id?: number | string | null;
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
  order_total?: string | number | null;
  currency_code?: string | null;
  is_marketplace_order?: boolean | null;
  products?: Array<{
    name?: string | { ar?: string | null; en?: string | null } | null;
    sku?: string | null;
    quantity?: number | string | null;
    price?: number | string | null;
  }> | null;
}

export interface ZidMappedOrder {
  externalOrderId: string;
  orderNumber: string;
  storeId?: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  orderDate?: Date;
  amount?: number;
  currency: string;
  storeStatus?: string;
  paymentStatus?: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: number;
    sku?: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOrderId(value: unknown): value is ZidOrderPayload {
  return isRecord(value) && (typeof value.id === "number" || typeof value.id === "string") && String(value.id).trim() !== "";
}

// Webhook bodies are the order object itself, but tolerate it being wrapped
// in { order } or { data } since the documented schema is not explicit.
export function extractZidOrder(body: unknown): ZidOrderPayload | null {
  if (!isRecord(body)) return null;
  if (hasOrderId(body.order)) return body.order;
  if (hasOrderId(body.data)) return body.data;
  if (hasOrderId(body)) return body;
  return null;
}

function cleanText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

// Marketplace orders arrive with masked customer data such as "J*** D***" or
// "***00"; storing those would only produce lookups that can never match.
function unmasked(value: string | undefined): string | undefined {
  if (!value || value.includes("*")) return undefined;
  return value;
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = parseFloat(normalizeArabicDigits(String(value)).replace(/[^\d.-]/g, ""));
  return isNaN(num) ? undefined : num;
}

// Zid timestamps may come without a timezone ("2024-05-01 13:20:00"). Zid
// stores operate on Riyadh time, so treat those as +03:00 instead of the
// server's local timezone.
export function parseZidDate(value: unknown): Date | undefined {
  const text = cleanText(value);
  if (!text) return undefined;

  const hasTimezone = /T|\s/.test(text) && /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
  const isoLike = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text.replace(" ", "T");
  const date = new Date(hasTimezone ? isoLike : `${isoLike}+03:00`);

  return isNaN(date.getTime()) ? undefined : date;
}

function productName(name: NonNullable<ZidOrderPayload["products"]>[number]["name"]): string | undefined {
  if (isRecord(name)) {
    return cleanText(name.ar) || cleanText(name.en);
  }
  return cleanText(name);
}

export function mapZidOrder(order: ZidOrderPayload): ZidMappedOrder {
  const externalOrderId = String(order.id).trim();
  const customer = order.customer || {};

  const mobile = unmasked(cleanText(customer.mobile));
  const email = unmasked(cleanText(customer.email));
  const normalizedEmail = email ? normalizeEmail(email) : "";

  const status = isRecord(order.order_status)
    ? cleanText(order.order_status.code)
    : cleanText(order.order_status);

  const items = (order.products || []).flatMap((product) => {
    const name = productName(product.name);
    if (!name) return [];
    const quantity = parseNumber(product.quantity);
    return [
      {
        name,
        quantity: quantity && quantity > 0 ? Math.round(quantity) : 1,
        price: parseNumber(product.price),
        sku: cleanText(product.sku),
      },
    ];
  });

  return {
    externalOrderId,
    // The numeric order id is what Zid shows merchants as the order number
    // (e.g. #1234567) and what proof file names are expected to contain.
    orderNumber: externalOrderId,
    storeId: cleanText(order.store_id),
    customerName: unmasked(cleanText(customer.name)),
    customerMobile: mobile ? normalizePhone(mobile) || undefined : undefined,
    customerEmail: isValidEmail(normalizedEmail) ? normalizedEmail : undefined,
    orderDate: parseZidDate(order.created_at),
    amount: parseNumber(order.order_total),
    currency: cleanText(order.currency_code)?.toUpperCase() || "SAR",
    storeStatus: status,
    paymentStatus: cleanText(order.payment_status),
    items,
  };
}
