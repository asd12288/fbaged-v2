# AGENT.md

This file is a working guide for AI agents (and humans) operating in this repository.

## 1) What This App Is

`fbaged-v2` is a React + Vite single-page app for managing:

- campaign performance
- budget and deposits
- account costs
- admin operations (maintenance mode, user management, "view as user")

Backend is Supabase (auth, tables, storage, RPC, edge functions), consumed directly from the frontend.

## 2) Core Stack

- React 18 + Vite
- React Router
- TanStack React Query
- Styled Components
- React Hook Form
- Recharts
- Supabase JS client

## 3) Dev Commands

```bash
npm install
npm run dev
npm run build
npm run lint
```

Current status:

- `npm run build` passes.
- `npm run lint` currently fails with many pre-existing issues (unused vars, missing `prop-types`, etc.). It also lint-checks files under `.worktrees/`, which duplicates errors.

## 4) Runtime Architecture

### App bootstrap

- `src/main.jsx` renders `App` in `StrictMode`.
- `src/App.jsx` sets:
  - `QueryClientProvider`
  - global styles
  - toaster
  - router

### Routing

- public:
  - `/login`
  - `/` (also points to login)
- protected (wrapped by `ProtectedRoute` + `AppLayout`):
  - `/dashboard`
  - `/campaigns`
  - `/budget`
  - `/admin-dashboard`

### Auth gate

- `useUser()` loads current auth user + profile row from `profiles`.
- `ProtectedRoute` redirects unauthenticated users to `/login`.

### App layout gate

- `AppLayout` loads user + maintenance setting.
- if maintenance mode is on:
  - admins continue to app
  - regular users see maintenance page
- admin users get wrapped in `AdminScopeProvider`.

## 5) Admin Scope ("View As User")

This is central to how admin data works.

- Scope lives in `src/features/admin/AdminScopeContext.jsx`.
- Selected user id is synced to URL query param `?user=<id>`.
- Selector UI is in sidebar (`AdminUserSwitcher`).
- For admins, most data hooks are disabled until `selectedUserId` exists:
  - `useCampaigns`
  - `useCampaign`
  - `useAccounts`
  - `useDeposits`

Do not remove/relax this behavior unless you intentionally want global admin-all-data queries.

## 6) Data Layer (Supabase)

Client: `src/services/supabase.js`

Uses:

- auth:
  - `supabase.auth.signInWithPassword`
  - `supabase.auth.getUser`
  - `supabase.auth.signOut`
- tables:
  - `profiles` (role, username)
  - `campaigns`
  - `accounts`
  - `deposits`
  - `settings` (id=1 row controls maintenance mode)
- storage:
  - `photos` bucket (campaign image uploads)
- rpc:
  - `admin_list_users` (preferred for users list)
- edge function:
  - `admin-users` (create/delete users)

### Important

`SUPABASE_URL` and anon key are currently hardcoded in `src/services/supabase.js`. Treat this as a sensitive/configuration concern when touching infra.

## 7) Feature Map

- `features/dashboard`:
  - KPI stats + warning banner + balance card + active campaigns table
- `features/campaigns`:
  - daily stats, full list, charts, create/edit flow
- `features/budget`:
  - deposits chart/list, expenses overview, account list
- `features/admin`:
  - admin controls (maintenance)
  - user-scoped campaign/account/deposit management
  - campaign create/edit modal form
- `features/users`:
  - create user form + management table

## 8) Query/Mutation Conventions

Main query keys:

- `["user"]`
- `["maintenanceMode"]`
- `["users"]`
- `["campaigns", scope]`
- `["campaign", id, scope]`
- `["accounts", scope]`
- `["deposits", scope]`

Mutations usually invalidate broad resource keys (for example `["campaigns"]`, `["accounts"]`, `["deposits"]`, `["users"]`), which refreshes scoped variants.

## 9) Known Codebase Quirks

- Naming/spelling inconsistencies are part of current structure:
  - `Campagins.jsx`
  - `useMaintenceMode.js`
  - multiple "maintence"/"resfrash"/"Dasboard" strings
- `README.md` is still default Vite template (not project-specific).
- `useBudget()` includes a temporary hardcoded value:
  - `positiveBudgetRequired = 7000`
- `Modal` API is simple open/close context; `opens`/`name` props are passed in some callers but not used for multi-window switching.
- Production bundle is large (~965 kB JS before gzip warning threshold handling).

## 10) Safe Change Playbook

When adding/changing a domain field (campaign/account/deposit):

1. update service API payload/select fields
2. update corresponding hook consumers
3. update admin forms + user views
4. verify derived calculations (dashboard/budget summaries)
5. verify query invalidation still refreshes the right views

When changing admin behavior:

1. validate `selectedUserId` flow in URL + sidebar
2. keep role checks (`user.role === "admin"`) aligned in nav/layout/routes
3. test both admin and regular user paths

## 11) Minimal Verification After Edits

Run:

```bash
npm run build
```

Then manually sanity-check:

- login/logout
- dashboard loads for regular user
- admin can select a scoped user from sidebar
- campaigns/budget/admin tabs load data for selected scoped user
