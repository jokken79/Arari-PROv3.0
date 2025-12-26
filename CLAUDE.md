# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**粗利 PRO v2.0** - Profit margin management system for ユニバーサル企画株式会社, a staffing company (派遣会社) specializing in manufacturing dispatch (製造派遣).

The system calculates and visualizes profit margins for dispatch employees by parsing Excel payroll files, computing billing amounts, and tracking company costs.

## Development Commands

### Start Development Servers

```bash
# Windows (recommended) - configures ports automatically
start-arari.bat              # Interactive port setup (e.g., 877 → 8877/3877)
restart-arari.bat            # Quick restart with last port
stop-arari.bat               # Stop all servers

# Manual start (any OS)
# Terminal 1 - Backend
cd arari-app/api
python -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd arari-app
npm run dev
```

### Auto-Generated Environment Files
`start-arari.bat` automatically creates these files:

**Frontend** (`arari-app/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_PORT=8000
NEXT_PUBLIC_FRONTEND_PORT=3000
NEXT_PUBLIC_ENABLE_AUTH=true
```

**Backend** (`arari-app/api/.env`):
```env
BACKEND_PORT=8000
FRONTEND_PORT=3000
FRONTEND_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@arari-pro.local
```

### Run Tests

```bash
# Backend tests (48 tests)
cd arari-app/api
python -m pytest tests/ -v

# Run single test file
python -m pytest tests/test_salary_calculations.py -v

# Frontend tests
cd arari-app
npm test
```

### Build & Lint

```bash
# Frontend
cd arari-app
npm run build
npm run lint

# Backend
cd arari-app/api
python -m ruff check .
python -m black .
```

### Install Dependencies

```bash
# Frontend
cd arari-app
npm install

# Backend
cd arari-app/api
pip install -r requirements.txt
```

## Architecture

```
arari-app/
├── api/                          # FastAPI backend (Python)
│   ├── main.py                   # Main API routes (~1800 lines - needs refactoring)
│   ├── salary_parser.py          # Excel payroll parser (ChinginGenerator format)
│   ├── employee_parser.py        # Employee master Excel parser
│   ├── services.py               # Business logic (margin calculations)
│   ├── database.py               # SQLite operations
│   ├── models.py                 # Pydantic models
│   ├── auth.py, auth_dependencies.py  # Authentication
│   ├── template_manager.py       # Factory Excel template detection
│   └── tests/                    # pytest tests
│
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── page.tsx              # Dashboard (home)
│   │   ├── employees/            # Employee list & detail
│   │   ├── monthly/              # Monthly analysis
│   │   ├── upload/               # Excel upload
│   │   ├── alerts/               # Alert management
│   │   └── settings/             # System settings
│   │
│   ├── components/
│   │   ├── charts/               # Recharts components (6 chart types)
│   │   ├── employees/            # Employee table, modals
│   │   ├── layout/               # Header, Sidebar
│   │   └── payroll/              # PayrollSlipModal (split into 5 files)
│   │
│   ├── hooks/                    # TanStack Query hooks
│   │   ├── useEmployees.ts
│   │   ├── usePayroll.ts
│   │   └── useStatistics.ts
│   │
│   └── lib/
│       ├── api.ts                # API client
│       ├── store.ts              # Zustand store
│       └── utils.ts              # Utilities (comparePeriods, etc.)
│
└── arari_pro.db                  # SQLite database
```

## Critical Business Formulas

### Billing Amount (請求金額)
```
請求金額 = (労働時間 × 単価 × 1.0)
         + (残業時間 ≤60h × 単価 × 1.25)
         + (残業時間 >60h × 単価 × 1.5)
         + (深夜時間 × 単価 × 0.25)   ← EXTRA, adds on top of base
         + (休日時間 × 単価 × 1.35)
```

### Total Company Cost (会社総コスト)
```
会社総コスト = 総支給額 (gross_salary)
             + 健康保険 (会社負担) = 本人負担と同額
             + 厚生年金 (会社負担) = 本人負担と同額
             + 雇用保険 (0.90%)  ← 2025年度
             + 労災保険 (0.30%)  ← 製造業
```

### Gross Profit (粗利)
```
粗利 = 請求金額 - 会社総コスト
マージン率 = 粗利 / 請求金額 × 100
```

### Margin Targets (製造派遣)
| Margin | Rating | Color |
|--------|--------|-------|
| ≥18% | Excellent | Emerald |
| 15-18% | Target | Green |
| 12-15% | Close | Amber |
| 10-12% | Improve | Orange |
| <10% | Low | Red |

**Important**: Manufacturing dispatch target is **15%** (not 25% like office/IT dispatch).

## Key Warnings - Prevent Common Bugs

### 1. Never Double-Count Paid Leave
```python
# WRONG - paid_leave_amount is already in gross_salary
total_cost = gross_salary + paid_leave_cost  # ❌

# CORRECT
total_cost = gross_salary  # paid_leave already included ✓
```

### 2. Overtime Split at 60 Hours
```python
# If raw_overtime > 60, split it:
overtime_hours = min(raw_overtime, 60)        # ×1.25 rate
overtime_over_60h = max(0, raw_overtime - 60)  # ×1.50 rate
```

### 3. Night Hours Are EXTRA (Not Replacement)
Night pay is an additional 0.25× on top of base hours, not a replacement rate.

### 4. Japanese Bracket Variants
Excel files may use either `通勤手当(非)` (ASCII) or `通勤手当（非）` (full-width). Parser handles both.

### 5. Period Sorting
Use `comparePeriods()` from utils.ts for chronological sorting. String sort fails: "2025年10月" < "2025年2月" alphabetically.

### 6. Login Token Field Name
Backend returns `token`, NOT `access_token`:
```typescript
// CORRECT - useAuth.ts expects this
interface LoginResponse {
  token: string        // ✓ Backend sends "token"
  token_type: string
  user: User
}

// WRONG - would cause login to fail
interface LoginResponse {
  access_token: string  // ✗ Backend does NOT send this
}
```

### 7. Login Redirect - Use Full Page Reload
After successful login, use `window.location.href` instead of `router.push()`:
```typescript
// CORRECT - forces AuthGuard to re-read localStorage
if (result.success) {
  window.location.href = '/'  // ✓
}

// WRONG - AuthGuard won't see new token (separate hook instance)
if (result.success) {
  router.push('/')  // ✗ Causes redirect loop back to /login
}
```
This is because `useAuth` hook creates separate state instances per component.

### 8. Dashboard Period Auto-Selection
Dashboard must auto-select a period when loaded, otherwise charts show empty:
```typescript
// In page.tsx - auto-select latest period
useEffect(() => {
  if (availablePeriods.length > 0 && !selectedPeriod) {
    const sorted = [...availablePeriods].sort(/* chronological */)
    setSelectedPeriod(sorted[0])  // Latest period
  }
}, [availablePeriods, selectedPeriod])
```

## Database Tables

### employees
- `employee_id` (PK), `name`, `dispatch_company` (派遣先)
- `hourly_rate` (時給), `billing_rate` (単価 - what we charge client)
- `status` (active/inactive), `gender`, `birth_date`, `termination_date`

### payroll_records
- `employee_id`, `period` (composite PK, e.g., "2025年10月")
- Hours: `work_hours`, `overtime_hours`, `overtime_over_60h`, `night_hours`, `holiday_hours`
- Salary: `base_salary`, `gross_salary`, `net_salary`
- Insurance: `social_insurance`, `welfare_pension`, `employment_insurance`
- Company costs: `company_social_insurance`, `company_employment_insurance`, `company_workers_comp`
- Results: `billing_amount`, `total_company_cost`, `gross_profit`, `profit_margin`

## Insurance Rates (2025年度)

| Type | Rate | Note |
|------|------|------|
| 社会保険 (company) | = employee amount | 労使折半 (50/50 split) |
| 雇用保険 (company) | 0.90% | Was 0.95% in 2024 |
| 労災保険 | 0.30% | Manufacturing sector |

## Authentication

### Environment Variables (`.env`)
Credentials are configured in `arari-app/api/.env` (auto-created by `start-arari.bat`):

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@arari-pro.local
```

Frontend auth toggle in `arari-app/.env.local`:
```env
NEXT_PUBLIC_ENABLE_AUTH=true
```

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **CHANGE IN PRODUCTION!**

### Auth Rules
- GET endpoints: No auth required
- POST/PUT/DELETE: `require_auth` or `require_admin` decorator
- Rate limit: 5 login attempts per minute

### Auth API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login, returns `{token, user}` |
| `/api/auth/logout` | POST | Logout, revokes token |
| `/api/auth/me` | GET | Get current user info |
| `/api/users` | GET | List users (admin only) |
| `/api/users` | POST | Create user (admin only) |
| `/api/users/change-password` | PUT | Change own password |
| `/api/users/{id}/reset-password` | PUT | Reset user password (admin only) |

### Password Change Examples
```bash
# Change own password (requires auth)
curl -X PUT http://localhost:8000/api/users/change-password \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"old_password":"admin123","new_password":"newPass123"}'

# Admin reset another user's password
curl -X PUT http://localhost:8000/api/users/2/reset-password \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_password":"newPass123"}'
```

## API Base URL

Development: `http://localhost:8000/api/`

Key endpoints:
- `/employees` - CRUD employees
- `/payroll` - Payroll records
- `/statistics` - Dashboard stats
- `/upload` - Excel file upload
- `/auth/login` - Authentication

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| State | TanStack Query (server), Zustand (client) |
| Charts | Recharts |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| Backend | FastAPI, Python 3.11+ |
| Database | SQLite (file: `arari-app/api/arari_pro.db`) |
| Excel Parser | openpyxl |

## Excel Parser System

The system uses a hybrid template approach:
1. First upload from a factory: Auto-detect field positions by label matching
2. Subsequent uploads: Use saved template for that factory
3. Fallback: Hardcoded `FALLBACK_ROW_POSITIONS` if detection fails

Templates are stored in `factory_templates` table with field positions and column offsets.

## File Locations for Common Tasks

| Task | Files |
|------|-------|
| Add new API endpoint | `arari-app/api/main.py` |
| Modify billing calculation | `arari-app/api/services.py` |
| Change Excel parsing | `arari-app/api/salary_parser.py` |
| Update dashboard charts | `arari-app/src/components/charts/` |
| Add new page | `arari-app/src/app/[pagename]/page.tsx` |
| Modify employee modal | `arari-app/src/components/employees/EmployeeDetailModal.tsx` |
| Update payroll detail view | `arari-app/src/components/payroll/` (5 files) |
| Modify authentication | `arari-app/api/auth.py`, `arari-app/src/hooks/useAuth.ts` |
| Change login page | `arari-app/src/app/login/page.tsx` |
| Update auth guard | `arari-app/src/components/auth/AuthGuard.tsx` |
| Configure startup | `start-arari.bat`, `restart-arari.bat`, `stop-arari.bat` |
| Backend env variables | `arari-app/api/.env` |
| Frontend env variables | `arari-app/.env.local` |
| Global app state | `arari-app/src/store/appStore.ts` |
