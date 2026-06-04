import * as XLSX from "xlsx";

export interface PreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  error?: string;
}

export interface ParsedOrder {
  source: "SALLA" | "SHOPIFY";
  orderNumber: string;
  customerName?: string;
  customerMobile?: string;
  customerEmail?: string;
  orderDate?: string;
  amount?: string;
  storeStatus?: string;
  items: Array<{
    name: string;
    quantity: number;
    price?: string;
    sku?: string;
  }>;
  rowNumber: number;
  rawData: Record<string, unknown>;
}

export interface ImportResult {
  success: number;
  updated: number;
  failed: number;
  errors: Array<{
    rowNumber: number;
    reason: string;
    rawData?: Record<string, unknown>;
  }>;
}

const ARABIC_DIGITS: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

export function normalizeArabicDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] || d);
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";

  let cleaned = phone.replace(/[\s\-+]/g, "");

  cleaned = normalizeArabicDigits(cleaned);

  cleaned = cleaned.replace(/^(00)/, "");

  if (cleaned.startsWith("966") && cleaned.length === 12) {
    return cleaned;
  }

  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "966" + cleaned.slice(1);
  }

  return cleaned;
}

export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const SALLA_COLUMNS: Record<string, string[]> = {
  orderNumber: ["رقم الطلب", "order number", "order_number", "Order ID", "id", "رقم الفاتورة", "Invoice ID"],
  customerName: ["اسم العميل", "العميل", "customer name", "customer", "name", "الاسم"],
  customerMobile: ["رقم الجوال", "الجوال", "الهاتف", "mobile", "phone", "customer phone", "رقم الهاتف"],
  customerEmail: ["البريد الإلكتروني", "الايميل", "email", "customer email", "الإيميل"],
  storeStatus: ["حالة الطلب", "status", "order status", "حالة"],
  orderDate: ["تاريخ الطلب", "created at", "created_at", "order date", "date", "التاريخ"],
  amount: ["المبلغ", "الإجمالي", "total", "amount", "المجموع"],
  products: ["المنتجات", "product", "products", "item", "lineitem name", "الصنف", "المنتج"],
};

const SHOPIFY_COLUMNS: Record<string, string[]> = {
  orderNumber: ["Name", "Order Name", "Order Number", "Order", "order_number", "#", "#Name"],
  customerEmail: ["Email", "Customer Email", "email"],
  customerMobile: ["Phone", "Billing Phone", "Shipping Phone", "customer phone", "mobile"],
  customerName: ["Customer", "Customer Name", "Billing Name", "Shipping Name", "First Name", "Last Name"],
  storeStatus: ["Financial Status", "Fulfillment Status", "Status"],
  orderDate: ["Created At", "created_at", "Date"],
  amount: ["Total", "Total Price", "Amount"],
  lineitemName: ["Lineitem name", "Lineitem Name", "Product"],
  lineitemQty: ["Lineitem quantity", "Lineitem Quantity", "Quantity"],
  lineitemPrice: ["Lineitem price", "Lineitem Price", "Price"],
  sku: ["Lineitem sku", "SKU", "sku"],
};

export function detectColumns(
  headers: string[],
  columnMap: Record<string, string[]>
): Record<string, string | null> {
  const detected: Record<string, string | null> = {};
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(columnMap)) {
    const found = aliases.find(
      (alias) =>
        lowerHeaders.includes(alias.toLowerCase()) ||
        lowerHeaders.includes(alias.toLowerCase().replace(/ /g, "_"))
    );
    if (found) {
      const index = lowerHeaders.indexOf(
        found.toLowerCase().replace(/ /g, "_")
      );
      if (index === -1) {
        const idx2 = lowerHeaders.indexOf(found.toLowerCase());
        detected[field] = idx2 !== -1 ? headers[idx2] : found;
      } else {
        detected[field] = headers[index];
      }
    } else {
      detected[field] = null;
    }
  }

  return detected;
}

function getCellValue(row: Record<string, unknown>, colKey: string | null): string {
  if (!colKey) return "";
  const val = row[colKey];
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseOrderDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

function parseAmount(amountStr: string): string | undefined {
  if (!amountStr) return undefined;
  const cleaned = amountStr.replace(/[^\d.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : String(num);
}

export function parseSallaRow(
  row: Record<string, unknown>,
  columns: Record<string, string | null>,
  rowNumber: number
): ParsedOrder | null {
  const orderNumber = getCellValue(row, columns.orderNumber);
  if (!orderNumber) return null;

  const customerMobile = getCellValue(row, columns.customerMobile);
  const customerEmail = getCellValue(row, columns.customerEmail);
  const customerName = getCellValue(row, columns.customerName);

  const phoneNormalized = customerMobile ? normalizePhone(customerMobile) : "";

  return {
    source: "SALLA",
    orderNumber,
    customerName: customerName || undefined,
    customerMobile: phoneNormalized || undefined,
    customerEmail: normalizeEmail(customerEmail) || undefined,
    orderDate: parseOrderDate(getCellValue(row, columns.orderDate)),
    amount: parseAmount(getCellValue(row, columns.amount)),
    storeStatus: getCellValue(row, columns.storeStatus) || undefined,
    items: [],
    rowNumber,
    rawData: row,
  };
}

export function parseShopifyRow(
  row: Record<string, unknown>,
  columns: Record<string, string | null>,
  rowNumber: number
): ParsedOrder | null {
  const orderNumber = getCellValue(row, columns.orderNumber);
  if (!orderNumber) return null;

  let customerName = getCellValue(row, columns.customerName);
  const customerEmail = getCellValue(row, columns.customerEmail);
  const customerMobile = getCellValue(row, columns.customerMobile);

  const phoneNormalized = customerMobile ? normalizePhone(customerMobile) : "";

  if (!customerName) {
    const firstName = getCellValue(row, "First Name");
    const lastName = getCellValue(row, "Last Name");
    if (firstName || lastName) {
      customerName = [firstName, lastName].filter(Boolean).join(" ");
    }
  }

  const items = [];
  const lineitemName = getCellValue(row, columns.lineitemName);
  if (lineitemName) {
    const qty = parseInt(getCellValue(row, columns.lineitemQty) || "1", 10);
    items.push({
      name: lineitemName,
      quantity: isNaN(qty) ? 1 : qty,
      price: parseAmount(getCellValue(row, columns.lineitemPrice)),
      sku: getCellValue(row, columns.sku) || undefined,
    });
  }

  return {
    source: "SHOPIFY",
    orderNumber,
    customerName: customerName || undefined,
    customerMobile: phoneNormalized || undefined,
    customerEmail: normalizeEmail(customerEmail) || undefined,
    orderDate: parseOrderDate(getCellValue(row, columns.orderDate)),
    amount: parseAmount(getCellValue(row, columns.amount)),
    storeStatus: getCellValue(row, columns.storeStatus) || undefined,
    items,
    rowNumber,
    rawData: row,
  };
}

export function parseExcelFile(
  buffer: Buffer,
  fileName: string
): { headers: string[]; rows: Record<string, unknown>[]; totalRows: number } {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (data.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = Object.keys(data[0]);
  return {
    headers,
    rows: data,
    totalRows: data.length,
  };
}

export function validateOrder(order: ParsedOrder): string | null {
  if (!order.orderNumber) {
    return "رقم الطلب مفقود";
  }

  const hasContact =
    order.customerMobile ||
    order.customerEmail ||
    order.customerName;

  if (!hasContact) {
    return "بيانات العميل مفقودة";
  }

  return null;
}

export function detectAndParse(
  buffer: Buffer,
  fileName: string,
  source: "SALLA" | "SHOPIFY"
): { orders: ParsedOrder[]; errors: Array<{ rowNumber: number; reason: string; rawData: Record<string, unknown> }> } {
  const { headers, rows } = parseExcelFile(buffer, fileName);

  const columnMap = source === "SALLA" ? SALLA_COLUMNS : SHOPIFY_COLUMNS;
  const detected = detectColumns(headers, columnMap);

  const orders: ParsedOrder[] = [];
  const errors: Array<{ rowNumber: number; reason: string; rawData: Record<string, unknown> }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const parsed =
      source === "SALLA"
        ? parseSallaRow(row, detected, rowNumber)
        : parseShopifyRow(row, detected, rowNumber);

    if (!parsed) {
      errors.push({
        rowNumber,
        reason: "رقم الطلب مفقود",
        rawData: row,
      });
      return;
    }

    const validationError = validateOrder(parsed);
    if (validationError) {
      errors.push({
        rowNumber,
        reason: validationError,
        rawData: row,
      });
      return;
    }

    orders.push(parsed);
  });

  return { orders, errors };
}

export function getPreviewRows(
  buffer: Buffer,
  fileName: string,
  source: "SALLA" | "SHOPIFY",
  limit: number = 20
): {
  previewRows: PreviewRow[];
  detectedColumns: Record<string, string | null>;
  totalRows: number;
} {
  const { headers, rows } = parseExcelFile(buffer, fileName);

  const columnMap = source === "SALLA" ? SALLA_COLUMNS : SHOPIFY_COLUMNS;
  const detected = detectColumns(headers, columnMap);

  const previewRows = rows.slice(0, limit).map((row, index) => {
    const parsed =
      source === "SALLA"
        ? parseSallaRow(row, detected, index + 2)
        : parseShopifyRow(row, detected, index + 2);

    const error = parsed ? validateOrder(parsed) : "رقم الطلب مفقود";

    return {
      rowNumber: index + 2,
      data: row as Record<string, string>,
      error: error || undefined,
    };
  });

  return {
    previewRows,
    detectedColumns: detected,
    totalRows: rows.length,
  };
}