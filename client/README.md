# FLC Budget Tracker

An improved rebuild of the DataInMeta "Budgeting System" used by the Florida League of Cities — same modules and data model, modernized UX, real charts, and faster workflows. Built with React + Vite and Recharts. Runs entirely in the browser on a local data layer (no backend or login required), seeded with sample data based on the original system.

## Modules (matching the original)

- **Dashboard** — fiscal-year selector with a live "% through FY" indicator, five KPI cards (total budget, invoiced/paid, variance, over-budget count, unbudgeted), a **Paid vs Remaining vs Over** stacked bar chart by expenditure category, click-to-drill category details, an unbudgeted-items table, and CSV export.
- **Add Budget** — full create form: vendor, line item, department, fiscal year, expenditure type, budget classification (Critical / Enhancement / Mandatory), budget + invoiced amounts, GASB 96 flag, purpose, TSD comments, and status (Active / Draft / Review / Inactive).
- **List Budget** — every line item with budget vs invoices and variance, filterable by fiscal year, expenditure type, and status, with running totals and **Budget Summary** / **Invoice Detail** exports.
- **List Vendor** — vendor records with derived active-contract counts and total value, plus add/delete.
- **Contracts List** — vendor contracts with amount, dates, GASB 96 / auto-renewal / multi-year flags, status, and **automatic "expiring within 90 days" alerts**.
- **Manage** — Users (Admin / Viewer roles), Expenditure Types, and Departments as simple CRUD lists.
- **Import** — bulk-import budget line items from CSV, with a downloadable template.

## What's improved over the original

- KPI summary cards and a clearer stacked chart that surfaces over-budget spend in its own color.
- Click any chart bar to drill straight into that category's line items.
- Real filtering (FY / type / status), search, and variance highlighting on every table.
- Expiring-contract alerts so renewals don't slip.
- Working CSV import **and** export everywhere, plus an import template.
- Light/dark theme, responsive layout, and a faster, cleaner data-entry form.

## Run it

```bash
npm install
npm run dev      # open the printed http://localhost:5173 URL
npm run build    # production build into dist/
```

## Data & notes

All data lives in the browser's `localStorage` (key `flcbudget.v1`), seeded on first run with the original system's reference lists (expenditure types, departments, vendors) and representative budget/contract/user records. **Reset sample data** in the sidebar restores the seed. The sample figures are illustrative — swap in real data via the form, CSV import, or by editing `src/store.js`.

To connect a real backend later, replace the `localStorage` read/write in `src/store.js` with API calls; the page components consume a small store API (`addBudget`, `addVendor`, `addContract`, …) and won't need to change.

## Structure

```
src/
  App.jsx              Sidebar nav (Dashboard / records / Manage), theme, routing
  store.js             Data layer + reference lists + seed + helpers
  components.jsx       Reusable TablePanel (search/paginate/export), Modal, Badge
  icons.jsx            Inline SVG icons
  styles.css           FLC design system (light/dark)
  pages/
    Dashboard.jsx      KPIs, stacked chart, drill-down, unbudgeted
    AddBudget.jsx      Create-budget form
    ListBudget.jsx     Filterable budget list + exports
    Vendors.jsx        Vendor CRUD
    Contracts.jsx      Contract CRUD + renewal alerts
    Users.jsx          User CRUD
    ManageList.jsx     Shared list for Expenditure Types & Departments
    Import.jsx         CSV import + template
```
