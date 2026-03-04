# Leads Import Distribution Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin-to-user CSV leads import pipeline with global email deduplication, per-batch ownership (`user + campaign`), and per-batch user download.

**Architecture:** Use a hybrid import flow: client parses CSV and requests preview; server-side RPC performs authoritative duplicate/validation checks and transactional import. Data is stored in `lead_import_batches` + `leads` (+ optional rejections), guarded by RLS so users can only access their own batches/leads.

**Tech Stack:** React 18 + Vite, TanStack Query, Supabase Postgres/RLS/RPC, `papaparse`, Vitest + React Testing Library.

---

### Task 1: Testing Foundation

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `src/test/setup.js`
- Modify: `src/main.jsx` (no behavior change; optional testability export if needed)

**Step 1: Write the failing test**

Create a smoke test first (it should fail because test tooling is missing):

```js
// src/utils/__tests__/smoke.test.js
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs test environment", () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/utils/__tests__/smoke.test.js`
Expected: FAIL because `test` script / vitest config does not exist yet.

**Step 3: Write minimal implementation**

Add dependencies and scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "@testing-library/react": "^16.2.0",
    "@testing-library/jest-dom": "^6.6.3",
    "jsdom": "^25.0.1"
  }
}
```

Add `vitest.config.js` and `src/test/setup.js`:

```js
// vitest.config.js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
  },
});
```

```js
// src/test/setup.js
import "@testing-library/jest-dom";
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/utils/__tests__/smoke.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.js src/test/setup.js src/utils/__tests__/smoke.test.js
git commit -m "test: add vitest foundation"
```

### Task 2: Lead CSV Normalization + Validation Utilities

**Files:**
- Create: `src/features/leads/utils/email.js`
- Create: `src/features/leads/utils/csv.js`
- Create: `src/features/leads/utils/__tests__/email.test.js`
- Create: `src/features/leads/utils/__tests__/csv.test.js`

**Step 1: Write the failing test**

```js
// src/features/leads/utils/__tests__/email.test.js
import { describe, it, expect } from "vitest";
import { normalizeEmail, isValidEmail } from "../email";

describe("email utils", () => {
  it("normalizes case and spaces", () => {
    expect(normalizeEmail("  A@Example.COM ")).toBe("a@example.com");
  });

  it("validates basic email format", () => {
    expect(isValidEmail("a@example.com")).toBe(true);
    expect(isValidEmail("bad-email")).toBe(false);
  });
});
```

```js
// src/features/leads/utils/__tests__/csv.test.js
import { describe, it, expect } from "vitest";
import { buildPreviewRows } from "../csv";

describe("csv preview", () => {
  it("marks duplicates within file and invalid rows", () => {
    const rows = [
      { email: "a@example.com" },
      { email: "A@example.com" },
      { email: "invalid" },
      { email: "" },
    ];

    const out = buildPreviewRows(rows);
    expect(out.summary.totalRows).toBe(4);
    expect(out.summary.inFileDuplicateRows).toBe(1);
    expect(out.summary.invalidRows).toBe(2);
    expect(out.candidateEmails).toEqual(["a@example.com"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/utils/__tests__/email.test.js src/features/leads/utils/__tests__/csv.test.js`
Expected: FAIL (`module not found`).

**Step 3: Write minimal implementation**

```js
// src/features/leads/utils/email.js
export function normalizeEmail(value) {
  return (value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
```

```js
// src/features/leads/utils/csv.js
import { isValidEmail, normalizeEmail } from "./email";

export function buildPreviewRows(rawRows) {
  const seen = new Set();
  const processedRows = [];

  for (const [index, row] of rawRows.entries()) {
    const rawEmail = row?.email ?? "";
    const email = normalizeEmail(rawEmail);

    if (!email || !isValidEmail(email)) {
      processedRows.push({ rowNumber: index + 1, email: rawEmail, status: "invalid_email" });
      continue;
    }

    if (seen.has(email)) {
      processedRows.push({ rowNumber: index + 1, email, status: "duplicate_in_file" });
      continue;
    }

    seen.add(email);
    processedRows.push({ rowNumber: index + 1, email, status: "candidate" });
  }

  return {
    processedRows,
    candidateEmails: processedRows.filter((r) => r.status === "candidate").map((r) => r.email),
    summary: {
      totalRows: rawRows.length,
      inFileDuplicateRows: processedRows.filter((r) => r.status === "duplicate_in_file").length,
      invalidRows: processedRows.filter((r) => r.status === "invalid_email").length,
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/utils/__tests__/email.test.js src/features/leads/utils/__tests__/csv.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/leads/utils/email.js src/features/leads/utils/csv.js src/features/leads/utils/__tests__/email.test.js src/features/leads/utils/__tests__/csv.test.js
git commit -m "feat: add lead csv/email validation utilities"
```

### Task 3: Supabase Schema + RLS + RPC (Preview/Confirm)

**Files:**
- Create: `supabase/migrations/20260304170000_leads_import.sql`
- Modify: `supabase/seed.sql` (optional lead sample rows)

**Step 1: Write the failing test**

Write SQL smoke checks to run after migration (initially fail before migration):

```sql
-- scripts/sql/leads_schema_smoke.sql
select to_regclass('public.lead_import_batches') as batches_table;
select to_regclass('public.leads') as leads_table;
select to_regclass('public.lead_import_rejections') as rejections_table;
```

**Step 2: Run test to verify it fails**

Run: `supabase db reset`
Run: `supabase db query -f scripts/sql/leads_schema_smoke.sql`
Expected: FAIL or null tables before migration is added.

**Step 3: Write minimal implementation**

In migration:
- Create tables `lead_import_batches`, `leads`, `lead_import_rejections`.
- Add unique index on `leads.email_normalized`.
- Enable RLS and add policies:
- Admin full access.
- User select only own `assigned_user_id` rows.
- Add helper SQL functions:
- `public.admin_leads_import_preview(assigned_user_id uuid, campaign_id bigint, emails text[])`
- `public.admin_leads_import_confirm(assigned_user_id uuid, campaign_id bigint, source_filename text, rows jsonb)`
- Ensure confirm function:
- verifies caller is admin,
- verifies campaign belongs to selected user,
- normalizes and validates emails,
- skips global duplicates,
- inserts batch + accepted leads + optional rejections,
- returns summary including `batch_id`.

**Step 4: Run test to verify it passes**

Run: `supabase db reset`
Run: `supabase db query -f scripts/sql/leads_schema_smoke.sql`
Expected: PASS with table names returned.

**Step 5: Commit**

```bash
git add supabase/migrations/20260304170000_leads_import.sql supabase/seed.sql scripts/sql/leads_schema_smoke.sql
git commit -m "feat: add leads import schema rls and rpc"
```

### Task 4: Leads Service Layer (Frontend -> RPC)

**Files:**
- Create: `src/services/leadsApi.js`
- Create: `src/features/leads/hooks/useLeadImportPreview.js`
- Create: `src/features/leads/hooks/useLeadImportConfirm.js`
- Create: `src/features/leads/hooks/useLeadBatches.js`
- Create: `src/features/leads/hooks/__tests__/leadsApi.test.js`

**Step 1: Write the failing test**

```js
// src/features/leads/hooks/__tests__/leadsApi.test.js
import { describe, it, expect, vi } from "vitest";
import supabase from "../../../services/supabase";
import { previewLeadImport } from "../../../services/leadsApi";

vi.mock("../../../services/supabase", () => ({
  default: { rpc: vi.fn() },
}));

describe("leadsApi", () => {
  it("calls preview rpc with payload", async () => {
    supabase.rpc.mockResolvedValue({ data: { duplicate_count: 2 }, error: null });
    const out = await previewLeadImport({ assignedUserId: "u1", campaignId: 1, emails: ["a@example.com"] });
    expect(supabase.rpc).toHaveBeenCalled();
    expect(out.duplicate_count).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: FAIL (`leadsApi` missing).

**Step 3: Write minimal implementation**

```js
// src/services/leadsApi.js
import supabase from "./supabase";

export async function previewLeadImport({ assignedUserId, campaignId, emails }) {
  const { data, error } = await supabase.rpc("admin_leads_import_preview", {
    p_assigned_user_id: assignedUserId,
    p_campaign_id: campaignId,
    p_emails: emails,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function confirmLeadImport({ assignedUserId, campaignId, sourceFilename, rows }) {
  const { data, error } = await supabase.rpc("admin_leads_import_confirm", {
    p_assigned_user_id: assignedUserId,
    p_campaign_id: campaignId,
    p_source_filename: sourceFilename,
    p_rows: rows,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getLeadBatches({ assignedUserId }) {
  let query = supabase
    .from("lead_import_batches")
    .select("id, created_at, source_filename, inserted_rows, duplicate_rows, invalid_rows, campaign_id")
    .order("created_at", { ascending: false });

  if (assignedUserId) query = query.eq("assigned_user_id", assignedUserId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/hooks/__tests__/leadsApi.test.js`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/services/leadsApi.js src/features/leads/hooks/useLeadImportPreview.js src/features/leads/hooks/useLeadImportConfirm.js src/features/leads/hooks/useLeadBatches.js src/features/leads/hooks/__tests__/leadsApi.test.js
git commit -m "feat: add leads rpc service and hooks"
```

### Task 5: Admin Leads Import UI

**Files:**
- Create: `src/features/leads/admin/AdminLeadsImportLayout.jsx`
- Create: `src/features/leads/admin/LeadsImportForm.jsx`
- Create: `src/features/leads/admin/LeadsImportPreviewCard.jsx`
- Create: `src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
- Modify: `src/pages/AdminDashboard.jsx`

**Step 1: Write the failing test**

```jsx
// src/features/leads/admin/__tests__/LeadsImportForm.test.jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LeadsImportForm from "../LeadsImportForm";

describe("LeadsImportForm", () => {
  it("renders required controls", () => {
    render(<LeadsImportForm />);
    expect(screen.getByText(/select user/i)).toBeInTheDocument();
    expect(screen.getByText(/select campaign/i)).toBeInTheDocument();
    expect(screen.getByText(/upload csv/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
Expected: FAIL (`component not found`).

**Step 3: Write minimal implementation**

- Add new admin tab in `AdminDashboard`: `leads`.
- Implement `LeadsImportForm` with:
- target user selector,
- campaign selector filtered by user,
- file input (`.csv`),
- preview trigger,
- confirm import action.
- Implement preview/result summary card.

Core behavior snippet:

```jsx
const [preview, setPreview] = useState(null);
const onPreview = async () => {
  const parsed = await parseCsv(file);
  const local = buildPreviewRows(parsed);
  const remote = await previewLeadImport({
    assignedUserId,
    campaignId,
    emails: local.candidateEmails,
  });
  setPreview({ local, remote });
};
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/admin/__tests__/LeadsImportForm.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/features/leads/admin/AdminLeadsImportLayout.jsx src/features/leads/admin/LeadsImportForm.jsx src/features/leads/admin/LeadsImportPreviewCard.jsx src/features/leads/admin/__tests__/LeadsImportForm.test.jsx src/pages/AdminDashboard.jsx
git commit -m "feat: add admin leads import workflow"
```

### Task 6: User Leads Batches Page + Download

**Files:**
- Create: `src/pages/MyLeads.jsx`
- Create: `src/features/leads/user/MyLeadsTable.jsx`
- Create: `src/features/leads/user/MyLeadsRow.jsx`
- Create: `src/features/leads/user/__tests__/MyLeadsTable.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/ui/MainNav.jsx`
- Modify: `src/services/leadsApi.js` (download helper)

**Step 1: Write the failing test**

```jsx
// src/features/leads/user/__tests__/MyLeadsTable.test.jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MyLeadsTable from "../MyLeadsTable";

describe("MyLeadsTable", () => {
  it("shows batch rows and download action", () => {
    render(
      <MyLeadsTable
        batches={[{ id: 10, source_filename: "march.csv", inserted_rows: 12, duplicate_rows: 2, invalid_rows: 1, created_at: "2026-03-04" }]}
      />
    );

    expect(screen.getByText(/march.csv/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download csv/i })).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/leads/user/__tests__/MyLeadsTable.test.jsx`
Expected: FAIL (`component not found`).

**Step 3: Write minimal implementation**

- Add route: `/my-leads` in `App.jsx`.
- Add nav item for all authenticated users in `MainNav.jsx`.
- Build batches table with columns:
- import date,
- campaign,
- source file,
- inserted,
- duplicates,
- invalid,
- download action.
- Implement `downloadBatchCsv(batchId)` in `leadsApi`:
- call Supabase function or signed endpoint,
- stream CSV blob and trigger browser download.

**Step 4: Run test to verify it passes**

Run: `npm run test -- src/features/leads/user/__tests__/MyLeadsTable.test.jsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/MyLeads.jsx src/features/leads/user/MyLeadsTable.jsx src/features/leads/user/MyLeadsRow.jsx src/features/leads/user/__tests__/MyLeadsTable.test.jsx src/App.jsx src/ui/MainNav.jsx src/services/leadsApi.js
git commit -m "feat: add my-leads page with per-batch download"
```

### Task 7: End-to-End Verification and Documentation

**Files:**
- Create: `docs/plans/2026-03-04-leads-import-verification.md`
- Modify: `README.md` (add short section for leads import usage)

**Step 1: Write the failing test**

Define a verification checklist that initially fails because feature is incomplete:

```md
- [ ] Admin can preview duplicate emails before import
- [ ] Import creates batch and inserts only new leads
- [ ] User can view only own batches
- [ ] User can download per-batch CSV
```

**Step 2: Run test to verify it fails**

Run manual verification against local stack:
- `supabase start`
- `npm run dev`
Expected: at least one checklist item fails before final fixes.

**Step 3: Write minimal implementation**

- Fix remaining gaps found in manual checks.
- Record exact verification evidence in doc:
- sample CSV used,
- preview counts,
- final inserted/duplicate/invalid counts,
- screenshot paths if available.

**Step 4: Run test to verify it passes**

Run:
- `npm run lint`
- `npm run test`
- manual admin/user flow in browser
Expected:
- lint passes,
- tests pass,
- checklist all checked.

**Step 5: Commit**

```bash
git add README.md docs/plans/2026-03-04-leads-import-verification.md
git commit -m "docs: add leads import verification notes"
```

## Execution Notes

- Keep commits small and task-scoped.
- Prefer SQL RPC for import authority instead of trusting client-side duplicate checks.
- Do not add XLSX or editable lead views in this phase (YAGNI).
- Validate CSV strictly for required `email` field only.

