# PROJECT_MAP — توثيق أضحيتي | Odheyati Proof Platform

---

## [TECH_STACK]

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** NextAuth.js (Credentials Provider)
- **Storage:** Cloudflare R2 (S3-compatible)
- **Package Manager:** npm
- **Node:** 22.x

---

## [SYSTEM_FLOW]

1. Admin imports orders from Excel/CSV (Salla or Shopify exports) via `/dashboard/import`.
2. Admin uploads proof media (images/videos) via `/dashboard/bulk-upload`, files are matched by order number in filename.
3. Files are stored in Cloudflare R2 under `proofs/{orderNumber}/videos/` or `proofs/{orderNumber}/images/`.
4. Each order gets a unique `proofToken` at creation.
5. Customer visits `/track`, searches by mobile or email.
6. If orders found, customer selects one and is redirected to `/proof/[token]`.
7. Proof page shows status message and signed URLs for media files.
8. No webhooks, no API integrations, no auto-sync. Everything is manual.

---

## [DATABASE_SCHEMA]

### Enums

- `AdminRole`: ADMIN
- `OrderSource`: SALLA, SHOPIFY, MANUAL
- `ProofStatus`: PENDING, IN_PROGRESS, SLAUGHTERED, READY, DELIVERED, CANCELLED
- `ProofFileType`: IMAGE, VIDEO
- `ImportStatus`: PENDING, COMPLETED, FAILED, PARTIAL

### Models

#### AdminUser
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| email | String | @unique |
| passwordHash | String | |
| name | String? | |
| role | AdminRole | @default(ADMIN) |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

#### Order
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| source | OrderSource | |
| externalOrderId | String? | |
| orderNumber | String | required |
| customerName | String? | |
| customerMobile | String? | |
| customerEmail | String? | |
| orderDate | DateTime? | |
| amount | Decimal? | |
| currency | String | @default("SAR") |
| storeStatus | String? | |
| proofStatus | ProofStatus | @default(PENDING) |
| proofToken | String | @unique @default(cuid()) |
| notes | String? | |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Indexes: orderNumber, customerMobile, customerEmail, proofToken, source, (source + orderNumber)

#### OrderItem
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| orderId | String | FK → Order |
| name | String | |
| quantity | Int | |
| price | Decimal? | |
| sku | String? | |
| createdAt | DateTime | @default(now()) |

#### ProofFile
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| orderId | String | FK → Order |
| type | ProofFileType | IMAGE or VIDEO |
| storageKey | String | R2 object key |
| fileName | String | |
| mimeType | String | |
| size | Int | bytes |
| sortOrder | Int | @default(0) |
| createdAt | DateTime | @default(now()) |
| uploadedById | String? | FK → AdminUser |

Indexes: orderId, type, storageKey

#### ImportBatch
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| source | OrderSource | |
| fileName | String | |
| totalRows | Int | |
| successRows | Int | |
| failedRows | Int | |
| status | ImportStatus | |
| createdAt | DateTime | @default(now()) |
| createdById | String? | FK → AdminUser |

#### ImportError
| Field | Type | Notes |
|-------|------|-------|
| id | String | @id @default(cuid()) |
| importBatchId | String | FK → ImportBatch |
| rowNumber | Int | |
| reason | String | |
| rawData | Json? | |
| createdAt | DateTime | @default(now()) |

---

## [ROUTES]

### Public
| Route | Description |
|-------|-------------|
| `/` | Home page with brand identity |
| `/track` | Customer search by mobile/email |
| `/proof/[token]` | Customer proof viewing page |

### Admin
| Route | Description |
|-------|-------------|
| `/dashboard/login` | Admin login |
| `/dashboard` | Dashboard overview |
| `/dashboard/orders/[id]` | Order detail + proof management |
| `/dashboard/import` | Import orders from Excel/CSV |
| `/dashboard/bulk-upload` | Bulk upload proof files |
| `/dashboard/settings` | Settings (future) |

### API
| Route | Description |
|-------|-------------|
| `/api/auth/login` | Admin login endpoint |
| `/api/auth/logout` | Admin logout |
| `/api/admin/orders` | List/search orders |
| `/api/admin/orders/[id]` | Get/update order |
| `/api/admin/import` | Import orders from file |
| `/api/admin/bulk-upload` | Bulk upload proof files |
| `/api/admin/r2-health` | R2 connectivity check |
| `/api/lookup` | Customer order lookup |
| `/api/proof/[token]` | Get proof data by token |

---

## [BRAND_IDENTITY]

### Colors
- **Primary Maroon:** `#973131`
- **Cream / Gold:** `#dca47c`
- **Taupe:** `#917e69`
- **Backgrounds:** Creamy white, warm white, soft beige borders

### Typography
- Arabic-first RTL layout
- Font: DIN Next Arabic → Tajawal → Cairo → system-ui

### Visual Style
- Calm, clean, trustworthy, official
- No heavy gradients
- No cold/techy style
- Suitable for an adhaahi (sacrifice) store with sharia-compliant documentation

### Logo
- `logo.svg` in project root
- Placeholder text: "أضحيتي" if file missing
- System name: "توثيق أضحيتي"
- Subtitle: "إدارة وتتبع توثيقات الطلبات"

---

## [CUSTOMER_MESSAGES]

### /track page
- **Title:** توثيقات أضحيتي
- **Description:** أدخل رقم جوالك أو بريدك الإلكتروني لمشاهدة توثيقات طلباتك.
- **Mobile help:** اكتب رقم الجوال بدون الصفر الأول، مثال: 5XXXXXXXX
- **Search button:** عرض التوثيق
- **No results:** لم نجد طلبًا مرتبطًا بهذه البيانات. تأكد من الرقم أو البريد وحاول مرة أخرى.
- **Order found, no files:** تم العثور على طلبكم، وجاري تجهيز التوثيق. سيتم إتاحة الصور والفيديوهات فور اكتمال الرفع.
- **Order found, ready:** توثيق طلبكم جاهز للمشاهدة.
- **Multiple orders:** وجدنا أكثر من طلب مرتبط ببياناتك. اختر الطلب الذي ترغب في متابعته.

### /proof/[token] page
- **PENDING:** تم استلام طلبكم، وجاري التحضير للتنفيذ.
- **IN_PROGRESS:** طلبكم قيد التنفيذ حاليًا، وسيتم تحديث التوثيق عند اكتماله.
- **SLAUGHTERED:** تم تنفيذ الذبح، وجاري تجهيز ملفات التوثيق.
- **READY:** توثيق طلبكم جاهز للمشاهدة.
- **DELIVERED:** تم اكتمال التوثيق وتسليم ملفات الطلب.
- **CANCELLED:** هذا الطلب ملغي. للتفاصيل يرجى التواصل معنا.
- **No files:** تم العثور على طلبكم، وجاري تجهيز التوثيق. سيتم إتاحة الصور والفيديوهات فور اكتمال الرفع.
- **Signed URL failure:** تم العثور على طلبكم، لكن تعذر تحميل بعض ملفات التوثيق مؤقتًا. يرجى المحاولة لاحقًا.
- **Token not found:** لم يتم العثور على التوثيق. تأكد من الرابط أو ابحث برقم الجوال أو البريد.
- **Unexpected error:** تعذر تحميل التوثيق مؤقتًا. يرجى المحاولة لاحقًا.

---

## [ADMIN_MESSAGES]

### Login
- تسجيل الدخول / البريد الإلكتروني / الكلمة المرور / دخول
- بيانات الدخول غير صحيحة / خطأ في الخادم، حاول مرة أخرى

### Dashboard
- لوحة التحكم / إدارة طلبات التوثيق
- إجمالي الطلبات / إجمالي العملاء / قيد التنفيذ / تم الذبح / التوثيق جاهز / فيها ملفات / بدون ملفات / ملغية

### Orders
- بحث برقم الطلب / بحث بالجوال / بحث بالإيميل / فلترة حسب الحالة / فلترة حسب المصدر
- لا توجد طلبات حتى الآن / لا توجد نتائج مطابقة

### Import
- استيراد الطلبات / مصدر الملف / سلة / Shopify / رفع ملف الطلبات
- اختر ملف Excel أو CSV / معاينة البيانات / اعتماد الاستيراد
- تم الاستيراد بنجاح / تعذر قراءة الملف / يوجد أخطاء في بعض الصفوف

### Bulk Upload
- رفع جماعي للتوثيقات / اسحب الملفات هنا أو اضغط لاختيارها
- تقرير الرفع / نجاح / فشل / فيديوهات / صور
- اسم الملف غير صحيح. استخدم مثل: 262190392.mp4
- لم يتم العثور على طلب مطابق لرقم الطلب في اسم الملف

---

## [IMPORT_FLOW]

1. Admin navigates to `/dashboard/import`.
2. Selects source: Salla or Shopify.
3. Uploads Excel (.xlsx) or CSV file.
4. Server parses file, validates rows.
5. Creates `ImportBatch` record.
6. For each valid row: upserts `Order` (match by `source + orderNumber`).
7. Records `ImportError` for failed rows.
8. Updates `ImportBatch` with success/failed counts.
9. Shows result summary to admin.

---

## [BULK_UPLOAD_FLOW]

1. Admin navigates to `/dashboard/bulk-upload`.
2. Drags or selects up to 100 files (max 100MB each).
3. Supported: MP4, MOV, WebM, JPG, JPEG, PNG, WebP.
4. For each file:
   - Extract order number from filename (e.g., `262190392.mp4`).
   - Look up order by `orderNumber`.
   - Upload to R2: `proofs/{orderNumber}/videos/{timestamp}-{cleanFileName}` or `images/`.
   - Create `ProofFile` record.
5. Show upload report with success/failure per file.

---

## [CUSTOMER_TRACK_FLOW]

1. Customer visits `/track`.
2. Enters mobile number or email.
3. Frontend calls `/api/lookup` with query.
4. Server searches orders by `customerMobile` or `customerEmail`.
5. Returns matching orders (without source, notes, or sensitive data).
6. If multiple orders: customer selects one.
7. Redirected to `/proof/[token]`.

---

## [PROOF_FLOW]

1. Customer visits `/proof/[token]`.
2. Server fetches order by `proofToken`.
3. Fetches associated `ProofFile` records.
4. Generates signed URLs for each file (per-file try/catch).
5. Returns order status + files with signed URLs.
6. Frontend displays status message and media gallery.
7. Never exposes: source, storageKey, R2 URL, notes.

---

## [R2_FLOW]

- **Endpoint:** `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
- **Region:** auto
- **Upload path:** `proofs/{orderNumber}/videos/{timestamp}-{cleanFileName}` or `proofs/{orderNumber}/images/{timestamp}-{cleanFileName}`
- **Upload body:** `Buffer.from(await file.arrayBuffer())`
- **ContentType:** `file.type` first, fallback by extension
- **Signed URL:** Generated per file, each in try/catch
- **Health check:** Upload test object, verify, delete
- **Commands:** PutObjectCommand, GetObjectCommand, DeleteObjectCommand (health only)

---

## [HOSTINGER_DEPLOYMENT_SETTINGS]

- **Framework:** Next.js
- **Branch:** main
- **Root directory:** ./
- **Node version:** 22.x
- **Build and output settings:** Default
- **Build command:** `prisma generate && next build`
- **Start command:** `next start`
- Project is at repository root (no monorepo, no subfolder)
- No Docker
- npm as package manager

---

## [SAFETY_RULES]

### Forbidden Operations
- `prisma migrate reset`
- `deleteMany`
- `truncate`
- `drop tables`
- Deleting orders
- Deleting proof files from DB
- Deleting R2 objects (except health check test object)
- Seeding production without approval
- Changing DATABASE_URL
- Deleting or regenerating proof tokens for existing orders

### Data Protection
- Never log DATABASE_URL
- Never log R2 secrets or access keys
- Never log passwords
- Never log signed URLs
- Never expose storageKey, source, or notes to customers

### Migration Rules
- All migrations must be additive only
- No destructive migrations
- No column drops without explicit approval

---

## [MILESTONES]

### Milestone 0 — Project Map ✅
- [x] Create PROJECT_MAP.md with all sections

### Milestone 1 — Foundation
- [ ] Next.js App Router setup
- [ ] TypeScript configuration
- [ ] Tailwind CSS with brand colors
- [ ] Arabic RTL layout
- [ ] Basic home page
- [ ] Admin login page + API
- [ ] Protected dashboard shell
- [ ] Prisma schema (all models)
- [ ] R2 helper skeleton
- [ ] .env.example
- [ ] README.md
- [ ] Build, typecheck, lint pass

### Milestone 2 — Import & Orders (pending approval)
- [ ] Excel/CSV parser
- [ ] Import flow for Salla
- [ ] Import flow for Shopify
- [ ] Order management in dashboard
- [ ] Order detail page
- [ ] Status update functionality

### Milestone 3 — Bulk Upload & R2 (pending)
- [ ] R2 integration (upload, signed URLs)
- [ ] Bulk upload page
- [ ] File name validation
- [ ] Upload report
- [ ] R2 health check

### Milestone 4 — Customer Facing (pending)
- [ ] /track page with search
- [ ] /proof/[token] page
- [ ] Lookup API
- [ ] Proof API
- [ ] Status messages
- [ ] Media gallery

### Milestone 5 — Polish & Deploy (pending)
- [ ] Error handling
- [ ] Loading states
- [ ] Responsive design
- [ ] Final testing
- [ ] Hostinger deployment

---

## [ORPHANS_AND_PENDING]

- `/dashboard/settings` — deferred to post-Milestone 1
- Export functionality — not in scope for now
- WhatsApp integration — not in scope for now
- Salla/Shopify API integration — not in scope (manual only)
- Customer registration — not in scope
- Payment — not in scope
- Webhooks — not in scope
