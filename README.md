# Syncro

**Syncro** is a high-performance team orchestration platform designed for teams that operate with urgency, ownership, and precision.  
It combines a premium control-room UI with strict role-aware data security so admins can command execution while members stay focused on delivery.

---

## Core Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **UI:** Tailwind CSS with deep-charcoal and indigo glassmorphism theme
- **Data Platform:** Supabase PostgreSQL + Supabase Auth
- **Access Model:** `ADMIN` / `MEMBER` with RLS-backed row-level control
- **Code Quality:** Absolute imports (`@/*`), modular services, DRY-first structure

---

## System Architecture

Syncro uses a hybrid rendering model built on Next.js App Router:

- **Server Components for protected shells and route decisions**
  - Protected route grouping (`src/app/(protected)`) fetches authenticated user context server-side.
  - Role-aware decisions happen before rendering sensitive screens.
- **Client Components for high-interaction UX**
  - Admin task assignment, project/task creation, and workspace toggles run client-side for speed.
  - Optimistic updates keep the app feeling instant.
- **Supabase as source of truth**
  - `projects`, `tasks`, and `profiles` tables drive live counts and operational state.
  - Auth identity (`auth.users`) is linked to application identity (`public.profiles`) via trigger.
- **Strict data boundary**
  - UI rendering is role-aware, but data authorization is enforced at database level through RLS policies.

---

## Security

Security in Syncro is enforced in layers:

### 1) Database-first authorization with RLS

RLS is enabled on `profiles`, `projects`, and `tasks`.  
Core rule set:

- Admins can see all tasks.
- Members can only see tasks assigned to themselves (`assignee_id = auth.uid()`).

### 2) Recursive-safe admin checks

The migration implements `public.is_admin(uid uuid)` as a `security definer` helper.  
Policies call this helper instead of self-referencing `profiles` subqueries inside `profiles` policies, preventing policy recursion issues and improving clarity/performance.

### 3) Auth profile auto-provisioning

`handle_new_auth_user()` trigger runs on `auth.users` inserts and creates a `public.profiles` row automatically, ensuring every authenticated user has role metadata.

### 4) Route protection in app layer

- Protected layout (`src/app/(protected)/layout.tsx`) redirects unauthenticated users to `/auth/sign-in`.
- `/admin` includes explicit role gating and redirects non-admin users to `/workspace`.

> Important: UI guards improve UX, but RLS remains the ultimate authority for data access.

---

## User Guide

## ADMIN Experience (God View)

Path: `/admin`

- Create new projects via modal
- Create tasks and assign owners
- Search tasks instantly by title
- Reassign tasks from the assignment interface
- Monitor workload distribution and live top-level metrics

Best for: Team leads, PMs, engineering managers, operations coordinators.

## MEMBER Experience (Work View)

Path: `/workspace`

- View personal assigned tasks
- Toggle status between `TODO` and `DONE`
- Receive instant success toasts
- Work in a distraction-free execution view

Best for: Individual contributors driving day-to-day task completion.

---

## Project Structure

```bash
src/
  app/                      # App Router pages and route groups
    (protected)/            # Auth-protected pages and shell
    auth/sign-in/           # Sign-in entry route
  components/               # UI modules (dashboard, workspace, shell, stat bar)
  hooks/                    # Reusable hooks
  lib/                      # Infra utilities (Supabase clients, events)
  services/                 # Domain logic (auth, dashboard data shaping)
  types/                    # Shared enums and contracts

supabase/
  migrations/               # SQL schema, trigger, and RLS policies
```

---

## Environment Setup (`.env.local`)

Create a local environment file in the project root:

### macOS/Linux
```bash
cp .env.example .env.local
```

### Windows PowerShell
```powershell
Copy-Item .env.example .env.local
```

Then set these values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<your-project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<your-anon-key>"
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

Notes:

- `NEXT_PUBLIC_*` keys are used by browser and server runtime where appropriate.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret. Never expose it in client-side logic.

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Open:
   - `http://localhost:3000/workspace`
   - `http://localhost:3000/admin`

---

## Production Readiness Highlights

- Next.js 14 App Router architecture with protected route groups
- Typed Supabase browser/server client separation
- RLS-first authorization with recursive-safe admin helper
- Optimistic UI with toast-driven feedback for create/update operations
- Premium SaaS UI language for demo and stakeholder presentation