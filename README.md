# Basic CRM System — Client Management & Job Tracking

Full-stack CRM matching the expanded spec: separate admin/employee login
portals, Kanban job board, customer timeline, realtime notifications, global
search, activity logs, and reports with export.

## Project layout

Matches the spec's suggested structure:

```
crm-system/
  client/    React (Vite) + Tailwind + React Query + TanStack Table + React Hook Form
  server/    Node + Express + Socket.io API, PostgreSQL via `pg`, Multer uploads
```

Within `server/src/`, routes double as controllers and raw SQL queries stand
in for a models layer (no separate `controllers/`/`models/` split) — this
keeps the CRUD logic in one place per resource rather than spreading it
across three files for a project this size. Say the word if you'd rather
have the strict MVC split the spec's folder tree implies.

## 1. Database

```
psql "$DATABASE_URL" -f server/sql/schema.sql
```

Creates `users`, `customers`, `jobs`, `notes`, `files`, `activity_logs`, and
`notifications`. No seed data — create your first admin via the
registration flow below.

## 2. Accounts and login portals

- **Two login pages**, per the spec: `/company/admin/login` and
  `/company/employee/login` (same `Login` component, a `portal` prop
  changes the copy and post-login redirect check).
- **Admin accounts are self-service** — the admin login page links to
  "Create an admin account" → `POST /api/auth/register-admin`. Set
  `ADMIN_SIGNUP_CODE` in the backend `.env` once you have your first admin.
- **Employee accounts are created by an admin** from the Employees tab —
  employees can't self-register.
- **Forgot password** (`/forgot-password` → `/reset-password?token=...`)
  generates and stores a real reset token, but no email provider is wired
  up yet, so it can't actually send mail. Outside production
  (`NODE_ENV !== "production"`), the token is returned directly in the
  response and the frontend shows it as a clickable dev link, so the flow
  is testable end to end. Wire in an email service (Resend, SES, etc.)
  where marked in `auth.routes.js` before relying on this in production.

## 3. Backend

```
cd server
cp .env.example .env
npm install
npm run dev               # nodemon, http://localhost:5000
```

| Area | Routes |
|---|---|
| Auth | `POST /api/auth/login`, `register-admin`, `forgot-password`, `reset-password` |
| Employees (admin) | `GET/POST/PUT /api/employees`, `PUT :id/status`, `POST :id/avatar`, `DELETE :id` |
| Customers | `GET/POST/PUT/DELETE /api/customers`, `GET :id/timeline` — employees see only their assigned customers; `?q=` searches name/company/email/phone |
| Jobs | `GET/POST/PUT /api/jobs`, `PUT :id/status` (Kanban drag-and-drop calls this), `PUT :id/progress`, `POST :id/notes` |
| Files | `POST /api/files/upload` (multipart, any file type), `GET /api/files?customerId=&jobId=`, `GET /api/files/:id/download`, `GET /api/files/employee/:userId/avatar` |
| Search | `GET /api/search?q=` — customers, jobs, employees in one call |
| Notifications | `GET /api/notifications`, `PUT :id/read`, `PUT read-all` |
| Activity logs (admin) | `GET /api/activity?q=&entityType=` |
| Reports (admin) | `overview`, `completed-trend`, `status-breakdown`, `jobs-per-employee`, `customer-growth`, `export` |

**Realtime (Socket.io)**: job/customer/file events broadcast to the `admins`
room and power the Overview's live activity feed; `job-assigned` and
`customer-assigned` go to the specific employee's own room
(`join-user <id>`), and every such event also writes a row to
`notifications` via `services/notification.service.js` — so "Employee
receives notification" / "Admin notified immediately" works whether or not
that person is online right now.

**File storage**: local disk by default (`src/config/fileStorage.js`) — see
the comment at the top of that file for swapping in Supabase Storage,
Cloudinary, or S3.

## 4. Job pipeline (Kanban)

Columns: **To Do → In Progress → Review → Completed**. Employees can drag a
job between To Do/In Progress/Review freely, and from Review into
Completed; a Completed job is closed — only an admin can reopen it (`PUT
/api/jobs/:id` with a `status`). See `VALID_TRANSITIONS` in `job.routes.js`
if you want a stricter or looser flow.

## 5. Customer pipeline

Defaults to the spec's 8 stages (New Lead, Contacted, Follow Up, In
Progress, Waiting for Client, Completed, Cancelled, Archived) via the admin
Customers table's status dropdown. The `status` column itself accepts any
string, so admins can introduce new stages by just typing a new value
somewhere that edits it — there's no separate "manage pipeline stages" UI
yet if you want the dropdown itself to be editable.

## 6. Frontend

```
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

Notable components: `KanbanBoard.jsx` (native HTML5 drag-and-drop, shared
by employee and admin Jobs views), `SearchBar.jsx` and `NotificationBell.jsx`
(both live in the header on both dashboards), `CustomerTimeline.jsx`.

## 7. Deploying

- **Frontend → Vercel**, **Backend → Render**, **Database → Supabase** — same
  as before. Render's filesystem is ephemeral on redeploy, so move file
  storage (and avatars) to Supabase/Cloudinary/S3 before relying on uploads
  in production.

## What's simplified or not built yet

Being upfront about the gap between this spec and this codebase:

- **"Sales" report**: the spec's DB design has no price/revenue field on
  jobs or customers, so no monetary figure is fabricated. `customer-growth`
  (new customers per month) is included instead, and the schema comment
  flags where a `jobs.price` column would go if you want real sales figures.
- **Excel/PDF export**: `/api/reports/export` returns CSV regardless of the
  requested format; the query is already there, adding `exceljs` or
  `pdfkit` is the remaining step.
- **Admin Settings / Profile pages, Employee Profile page**: not built —
  the API already has what a basic profile page needs (`PUT
  /api/employees/:id`, avatar upload), just no dedicated screen yet.
- **Customizable customer-status list**: the pipeline is a plain string
  column (any value is accepted), but there's no admin screen to manage the
  list of stages shown in the dropdown — it's hardcoded to the spec's 8 in
  `AdminCustomers.jsx`.
- **True "online" presence** for the Overview's Employees Online count: it
  reuses each employee's Active/Inactive account status rather than
  tracking live socket connections — see the comment in `AdminOverview.jsx`.
