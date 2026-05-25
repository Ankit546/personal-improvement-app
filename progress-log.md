# Progress Log

## Stack
- **Frontend**: Next.js 16.2.6, TypeScript, Tailwind CSS, App Router, src/ directory
- **Backend**: Supabase (Postgres + Auth + RLS)
- **AI**: OpenAI GPT-4o-mini via Next.js API route (`/api/generate-steps`)
- **Hosting**: Vercel (auto-deploys on push to main)
- **Repo**: https://github.com/Ankit546/personal-improvement-app

## Live URL
https://personal-improvement-app.vercel.app

---

## Database Schema

### goals
| Column | Type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| title | text |
| description | text |
| current_value | text |
| target_value | text |
| progress_percent | int |
| deadline | date |

### steps
| Column | Type |
|---|---|
| id | uuid (PK) |
| goal_id | uuid (FK → goals) |
| title | text |
| status | text (todo/in_progress/done/blocked) |
| points | int |
| deadline | date |
| is_recurring | boolean |
| recurrence_type | text (daily/weekly/monthly) |

### user_points
| Column | Type |
|---|---|
| id | uuid (PK) |
| user_id | uuid (FK → auth.users) |
| goal_id | uuid |
| step_id | uuid |
| points | int |

### step_completions
| Column | Type |
|---|---|
| id | uuid (PK) |
| step_id | uuid (FK → steps) |
| user_id | uuid (FK → auth.users) |
| completed_date | date |
| UNIQUE | (step_id, completed_date) |

All tables have RLS enabled. Policies use `auth.uid() = user_id`.

---

## Pages & Files

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Redirects to /login |
| `src/app/login/page.tsx` | Email/password login + signup toggle |
| `src/app/dashboard/page.tsx` | Goals list, add goal modal, total points |
| `src/app/dashboard/[id]/page.tsx` | Goal detail — Kanban board + Recurring Habits section |
| `src/app/visualizer/page.tsx` | Hero journey visualizer |
| `src/app/api/generate-steps/route.ts` | Server-side OpenAI call |
| `src/lib/supabase.ts` | Supabase browser client (createBrowserClient) |
| `src/lib/useRequireAuth.ts` | Client-side auth guard hook |

---

## Features Built

### Auth
- Email/password login and signup on `/login`
- `useRequireAuth` hook protects `/dashboard` and `/visualizer`
- Redirects to `/login` if not authenticated
- Note: middleware approach was abandoned — Turbopack edge runtime incompatibility in Next.js 16. Using client-side hook instead.

### Goals
- Create goals with title, description, current value, target value, deadline
- Goals shown as cards with progress bar, deadline, current/target values
- Clicking a goal card opens the goal detail page

### Steps (Kanban)
- 4 columns: Todo / In Progress / Blocked / Done
- Add step with title, deadline, recurring toggle
- Delete step (also removes associated points)
- Moving step to Done awards 10 points; moving back removes them
- Progress % recalculates automatically from step statuses

### Recurring Habits
- Checkbox on add-step form: "Recurring?" → dropdown: Daily / Weekly / Monthly
- Recurring steps appear in a "Recurring Habits" section above the Kanban
- Daily: shows current week Mon–Sun as dots (filled=done, gray=missed, dashed=future)
- Weekly/Monthly: dots grow with streak (new users see just 1 dot)
- Streak calculated from step_completions table
- Toggle today's completion via checkbox; persists to DB

### Points & Gamification
- 10 points per step completed
- Points stored in user_points table (per step, per user)
- Total shown on dashboard header
- Badges not yet built

### AI Step Generation
- "Generate with AI" button on goal detail page
- User provides context about their situation
- GPT-4o-mini returns 5 steps as JSON
- Steps inserted into DB automatically

### Hero Visualizer (`/visualizer`)
- Overall progress = average of all goal progress %
- 🧑 avatar moves on a horizontal bar from Reality (0%) to Expectation (100%)
- Each goal shows Now vs Target panels + individual progress bar + deadline

---

## Pending / Next Up
- [ ] Logout button
- [ ] Badges (milestones: 50pts = "Getting Started", 100pts = "On a Roll", etc.)
- [ ] Weekly progress email (Resend integration)
- [ ] Mobile UI improvements (current layout not optimised for small screens)
- [ ] Points for recurring habit streaks (currently only one-time steps earn points)
