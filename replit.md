# Appointment Management System

AI-powered appointment booking app with two interfaces:

1. **Customer Chatbot** (`/`) — conversational booking flow that walks visitors through name, address, phone, reason, staff selection, and date/time. Validates phone format, rejects past dates, and detects double-bookings against the same staff member at the same time.
2. **Manager Dashboard** (`/admin`) — password-protected dashboard with stats, filters by staff/date/status, and Confirm / Complete / Cancel / Delete actions per appointment.

Default admin credentials (seeded on first boot): `admin` / `admin123`.

## Stack

- **Frontend**: React + Vite + Tailwind + shadcn/ui + wouter, served from `artifacts/relationships`.
- **API**: Express 5 (`artifacts/api-server`), JWT cookie auth (`bcryptjs` + `jsonwebtoken`), Drizzle ORM on Postgres.
- **Contracts**: OpenAPI spec at `lib/api-spec/openapi.yaml`. Orval generates a Zod validation lib (`lib/api-zod`) and a React Query client (`lib/api-client-react`).
- **Database schema**: `lib/db/src/schema/` — `appointments` (with unique `(requestedStaff, appointmentDate)` index for conflict detection) and `admins`.

## Common commands

- Push DB schema: `pnpm --filter @workspace/db run push`
- Regenerate API client + zod: `pnpm --filter @workspace/api-spec run codegen`
- Typecheck everything: `pnpm run typecheck`

## Notes

- The `JWT_SECRET` env var should be set in production. A dev fallback is used otherwise.
- Cookies are non-secure in dev so the workspace iframe preview works; revisit when deploying with HTTPS.

## Email & Patient History

- **Email step**: Chatbot asks for email after phone number (`ask_email` step). Email is validated and stored in the `appointments.email` column (nullable, so old records are unaffected).
- **Booking confirmation email**: After successful booking, a confirmation email is sent to the patient. Uses Nodemailer with SMTP env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Email is skipped silently if not configured.
- **Patient history**: `/admin/patients` endpoint groups all appointments by phone number. The manager dashboard has an "Appointments" / "Patients" tab switcher. The Patients tab shows each patient's name, phone, email, total visits, last visit date, and an expandable appointment history.

## Internationalization (i18n)

- Both pages support **English** and **Amharic** via a flag toggle button in the header (🇬🇧 EN / 🇪🇹 አማ).
- Client dictionary lives in `artifacts/relationships/src/lib/i18n.tsx` (`I18nProvider`, `useI18n`, `LangToggle`). Selected language is persisted to `localStorage` under `appt_lang`.
- The chatbot sends a `lang` field with each turn; server replies are translated in `artifacts/api-server/src/lib/chatbot.ts` (string tables for both languages, lang-aware option labels).
