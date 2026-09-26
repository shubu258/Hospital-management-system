# Karishava — Medical Referral CRM

Karishava is a CRM for a medical-tourism sales team. It tracks every patient referral from the first contact to active care. It keeps patient details, medical reports, the status pipeline and team assignments in one place.

It is made of three apps that share one Supabase project:

| App | What it is | Who uses it | Deployed on | Live URL |
| --- | --- | --- | --- | --- |
| **Backend API** (`/`) | Express + TypeScript REST API | Both frontends | **Render** | https://hospital-management-system-crqf.onrender.com |
| **Sales App** (`/sales-app`) | Next.js web app | Sales team | **Vercel** | https://karisava-hospitaly-sales-filet.vercel.app |
| **Admin App** (`/admin-app`) | Next.js admin console | Administrators | **Vercel** | `<admin-app-url>` |
| **Database, Auth, Storage** | Supabase (Postgres + Auth + Storage) | Backend | **Supabase Cloud** | — |

---

## Case Study

### The problem

Karishava's sales team works with patients from many countries who travel abroad for treatment. Before this system, each referral was spread across WhatsApp chats, email threads and spreadsheets. This caused four problems:

- **Nobody knew where a case stood.** Had the patient replied? Were the reports in? Had a treatment plan been sent?
- **Medical reports were scattered.** Files were attached to emails and chats, with no single copy tied to the patient.
- **There was no accountability.** Nobody could see who changed a case, or when.
- **Management had no overview.** There was no simple way to see the pipeline, conversion by stage, or each person's workload.

### The solution

We built a CRM around one **case record per patient** that moves through a fixed pipeline:

```
NEW → PATIENT_REPLIED → REPORT_RECEIVED → TREATMENT_PLAN_SENT → IN_DISCUSSION → ACTIVE → CLOSED
```

**Sales App** (for the sales team)
- Add patients: name, country, contact details, medical condition and description.
- Move patients through the pipeline. Every change is logged in a status history timeline showing who changed it and when.
- Upload medical reports (PDF, JPG, PNG, up to 10 MB) to the patient's record.
- See a personal dashboard of their own leads.
- Collaborate: every sales user can see and work on every lead, so cases don't stall when someone is away.
- Sign in with email and password or **Google**, and reset a forgotten password by email.

**Admin App** (for administrators)
- A full dashboard and analytics across the whole pipeline.
- Assign or reassign patients, including bulk assignment by status.
- Delete patients or correct mistaken status-history entries. Only admins can do this.
- Manage the team and see who is on it.

### Key technical decisions

1. **Two separate frontends and one API.** The sales and admin apps are separate Next.js deployments with separate session cookies. The admin console can be locked down (only the `ADMIN` role can log in) without affecting the sales app. All business logic lives in one Express API.

2. **Security enforced in the database.** Postgres **Row Level Security (RLS)** policies are the final gatekeeper, not just checks in the API. The API queries Supabase *as the logged-in user*, so even a bug in an API route can't leak or delete data that user isn't allowed to touch. Deletes are admin-only at the RLS level.

3. **Roles can't be spoofed.** A user's role is never taken from a signup form. A Postgres trigger (`handle_new_user`) creates the profile when the account is created. It gives the `ADMIN` role only to emails on a server-side allowlist, and everyone else becomes a `SALES_USER`. This applies to password signups and Google signups alike.

4. **Tokens never reach browser JavaScript.** The Next.js apps store the Supabase session in an **httpOnly cookie** and pass API calls through their own server routes (`/api/backend/*`). The browser never holds the access token directly, which protects it from XSS.

5. **Private document storage.** Reports are stored in a **private** Supabase Storage bucket, in folders named by patient ID. Storage RLS mirrors the table rules. Files are served only through short-lived signed URLs that expire after 5 minutes.

6. **Google sign-in with a stateless API.** Google sign-in uses the OAuth PKCE flow, which needs a temporary secret (the "code verifier") kept between leaving for Google and coming back. The Express API keeps no state between requests, so it returns the verifier to the Next.js app. The app holds it in a 10-minute, path-scoped httpOnly cookie and sends it back on the callback.

### Challenges we solved

- **Session expiry loops.** When a token expired, the app bounced endlessly between `/login` and `/dashboard`, because the stale cookie was still present. The fix is a dedicated `/session-expired` route that clears the cookie before redirecting.
- **Team visibility vs. privacy.** Sales users need to see who added or changed a lead, but must not read every teammate's email and role. The fix is a `SECURITY DEFINER` directory function that exposes only names.
- **Password resets on the server.** Reset emails use a `token_hash` link, which the API verifies on the server. After a reset, every other session is signed out.

---

## Architecture

```
            ┌──────────────────────┐        ┌──────────────────────┐
            │  Sales App (Vercel)  │        │  Admin App (Vercel)  │
            │  Next.js             │        │  Next.js             │
            │  httpOnly session    │        │  httpOnly session    │
            └──────────┬───────────┘        └──────────┬───────────┘
                       │  server-side fetch (Bearer)   │
                       └───────────────┬───────────────┘
                                       ▼
                         ┌──────────────────────────┐
                         │  Backend API (Render)    │
                         │  Express + TypeScript    │
                         └────────────┬─────────────┘
                                      ▼
                  ┌──────────────────────────────────────┐
                  │  Supabase                            │
                  │  Postgres + RLS · Auth · Storage     │
                  └──────────────────────────────────────┘
```

### Tech stack

- **Backend:** Node.js, Express 4, TypeScript, `@supabase/supabase-js`, Multer (file uploads)
- **Frontends:** Next.js 16 (App Router), React 19, Tailwind CSS 4, lucide-react
- **Platform:** Supabase (Postgres, Auth with Email and Google, Storage)
- **Hosting:** Render (API), Vercel (both frontends)

### Repository layout

```
.
├── src/                    # Backend API
│   ├── config/             # env + Supabase clients
│   ├── modules/
│   │   ├── auth/           # login, register, Google OAuth, password reset, middleware
│   │   ├── patients/       # CRUD, status changes, assignment
│   │   ├── documents/      # report upload / list / delete
│   │   ├── dashboard/      # stats and analytics
│   │   └── users/          # team + directory
│   └── utils/
├── supabase/migrations/    # schema, RLS, storage, roles
├── sales-app/              # Next.js — sales team
└── admin-app/              # Next.js — administrators
```

### API overview

All routes are under `/api` and, except the auth routes, need `Authorization: Bearer <token>`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout`, `GET /auth/me`, `POST /auth/google/start`, `/auth/google/exchange`, `/auth/forgot-password`, `/auth/reset-password` |
| Patients | `GET/POST /patients`, `GET/PATCH/DELETE /patients/:id`, `PATCH /patients/:id/status`, `GET /patients/:id/status-history`, `PATCH /patients/:id/assign`, `PATCH /patients/assign-by-status` |
| Documents | `GET/POST /patients/:id/documents`, `DELETE /patients/:id/documents/:documentId` |
| Dashboard | `GET /dashboard`, `/dashboard/analytics`, `/dashboard/my` |
| Users | `GET /users`, `/users/directory` |
| Health | `GET /health` |

---

## Deployment

### 1. Supabase (database, auth, storage)

1. Create a Supabase project.
2. Run the SQL files in `supabase/migrations/` **in filename order** (SQL editor or `supabase db push`). This creates the tables, RLS policies, the `patient-documents` storage bucket, and the role trigger.
3. To change who is an admin, edit the email list in `public.admin_emails()` (in `20260922000000_admin_access_and_registration.sql`) and re-run that function.
4. **Authentication → URL Configuration**
   - Site URL: `https://karisava-hospitaly-sales-filet.vercel.app`
   - Redirect URLs:
     - `https://karisava-hospitaly-sales-filet.vercel.app/auth/callback`
     - `https://karisava-hospitaly-sales-filet.vercel.app/reset-password`
     - `http://localhost:3001/**` (local development)
5. **Authentication → Providers → Google:** enable it and add the Client ID and Secret from Google Cloud Console. In Google Cloud, the authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`.
6. **Authentication → Email Templates → Reset Password:** set the link to
   `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery`
7. For production, set up custom SMTP (Authentication → SMTP). Supabase's built-in mailer is heavily rate-limited.

### 2. Backend API → Render

Deployed as a Render **Web Service** from the repository root.

| Setting | Value |
| --- | --- |
| Root directory | *(repo root)* |
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` (runs `node dist/server.js`) |
| Health check path | `/health` |

**Environment variables:**

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. **Secret; server only.** |
| `PORT` | Set automatically by Render |

Live at **https://hospital-management-system-crqf.onrender.com**. Check it with `GET /health`.

> On Render's free plan the service sleeps when idle, so the first request after a quiet period can take 30–60 seconds.

### 3. Sales App → Vercel

Deployed as a Vercel project with **Root Directory = `sales-app`**. Vercel detects Next.js automatically.

| Variable | Value |
| --- | --- |
| `EXPRESS_API_URL` | `https://hospital-management-system-crqf.onrender.com` (no trailing slash) |

Live at **https://karisava-hospitaly-sales-filet.vercel.app**

### 4. Admin App → Vercel

A second Vercel project from the same repo, with **Root Directory = `admin-app`**.

| Variable | Value |
| --- | --- |
| `EXPRESS_API_URL` | `https://hospital-management-system-crqf.onrender.com` (no trailing slash) |

Live at **`<admin-app-url>`**

### Deploy flow

Pushing to `main` triggers automatic redeploys: Render rebuilds the API, and Vercel rebuilds whichever frontend changed. When a change touches both the API and a frontend (for example the auth features), make sure the **Render deploy has finished** before relying on the new frontend.

---

## Running locally

**Prerequisites:** Node.js 20+ and a Supabase project set up as described above.

```bash
# 1. Backend  → http://localhost:4000
cp .env.example .env          # fill in the SUPABASE_* values
npm install
npm run dev

# 2. Sales app → http://localhost:3001
cd sales-app
cp .env.local.example .env.local   # EXPRESS_API_URL=http://localhost:4000
npm install
npm run dev

# 3. Admin app → http://localhost:3000
cd admin-app
cp .env.local.example .env.local   # EXPRESS_API_URL=http://localhost:4000
npm install
npm run dev
```

Useful scripts (backend): `npm run build`, `npm run typecheck`, `npm start`.

---

## License

MIT © 2026 Shivansh Nigam. See [LICENSE](LICENSE).
