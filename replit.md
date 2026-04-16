# Relations — Relationship Tracker

A focused tool for tracking people and context around them (sales leads, clients, investors, candidates, or personal contacts). Designed in the spirit of Linear/Attio: dense but breathable, light mode primary with dark mode, single accent color, no gradients or emojis.

## Architecture

Monorepo (pnpm workspace). Artifacts:
- `artifacts/api-server` — Express + drizzle-orm, exposes `/api/*` routes.
- `artifacts/relationships` — React + Vite (wouter, TanStack Query, @dnd-kit, cmdk, next-themes) frontend at `/`.
- `artifacts/mockup-sandbox` — template scaffold, unused for this product.

Shared libs:
- `lib/api-spec` — OpenAPI 3.0.3 contract + orval codegen.
- `lib/api-client-react` — generated React Query hooks.
- `lib/api-zod` — generated zod validators (used for request validation in routes).
- `lib/db` — drizzle schema: `workspace`, `stages`, `contacts`, `interactions`.

## Data model
- `workspace` — singleton (`id="default"`); holds `initialized`, `relationshipType`, `entityLabel`/plural, `affiliationLabel`.
- `stages` — ordered pipeline stages with color.
- `contacts` — name, affiliation, email, phone, stageId, tags (jsonb string[]), notes.
- `interactions` — contactId, kind (note|call|meeting|email), body, occurredAt.

## Feature surface
- First-run onboarding at `/onboarding` — choose relationship type, labels, stage names → `POST /api/workspace/initialize` (transactional).
- Dashboard `/` — counts, per-stage breakdown, recent activity.
- Pipeline `/pipeline` — kanban with drag-and-drop between stages (@dnd-kit). Optimistic update on drop.
- Contacts `/contacts` — sortable table, debounced search, stage + tags filters, 40px rows, add dialog.
- Contact detail `/contacts/:id` — inline-editable fields with autosave, interaction composer (note/call/meeting/email), timeline.
- Settings `/settings` — edit labels, manage stages (rename, delete, reorder), CSV export, dark mode.
- Cmd/Ctrl+K palette — quick-add and jump-to-contact.

## Workflows
- `artifacts/api-server: API Server` — runs the Express API.
- `artifacts/relationships: web` — runs the Vite dev server.

## Seed data
`pnpm --filter @workspace/scripts run seed` — initializes workspace, 6 stages, 8 contacts, ~13 interactions. No-op if already initialized.

## Codegen
From `lib/api-spec`: `pnpm run codegen` regenerates `lib/api-client-react` + `lib/api-zod` from `openapi.yaml`.

Note: OpenAPI schema request-body types are named *Input-style (e.g. `NewContact`, `ContactUpdate`) to avoid name collision with zod consts which orval derives from operationIds (e.g. `CreateContactBody`).
