# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**粗利 PRO v3.0** - Profit margin management system for ユニバーサル企画株式会社, a staffing company (派遣会社) specializing in manufacturing dispatch (製造派遣).

The system calculates and visualizes profit margins for dispatch employees by parsing Excel payroll files, computing billing amounts, and tracking company costs. It includes agent commission management (仲介手数料) and company-specific additional cost tracking (追加コスト).

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
│   ├── database.py               # SQLite/PostgreSQL operations (dual-mode)
│   ├── models.py                 # Pydantic models
│   ├── auth.py, auth_dependencies.py  # Authentication
│   ├── template_manager.py       # Factory Excel template detection
│   ├── additional_costs.py       # Company additional costs (送迎バス等)
│   ├── agent_commissions.py      # Agent commission calculations (仲介手数料)
│   ├── reports.py                # Excel report generation
│   ├── budget.py                 # Budget management
│   ├── alerts.py                 # Alert/notification system
│   └── tests/                    # pytest tests (7 test files)
│
├── src/
│   ├── app/                      # Next.js App Router pages (15 pages)
│   │   ├── page.tsx              # Dashboard (home)
│   │   ├── employees/            # Employee list & detail
│   │   ├── companies/            # Company analysis & detail
│   │   ├── monthly/              # Monthly analysis
│   │   ├── payroll/              # Payroll data verification
│   │   ├── reports/              # Report download
│   │   ├── upload/               # Excel upload (admin only)
│   │   ├── templates/            # Template management (admin only)
│   │   ├── alerts/               # Alert management
│   │   ├── budgets/              # Budget vs actual
│   │   ├── additional-costs/     # Additional costs management
│   │   ├── agent-commissions/    # Agent commission tracking
│   │   ├── settings/             # System settings
│   │   ├── help/                 # Help page
│   │   └── login/                # Authentication
│   │
│   ├── components/
│   │   ├── charts/               # Recharts components (12 chart types)
│   │   ├── dashboard/            # Dashboard components (StatsCard, PeriodSelector)
│   │   ├── employees/            # Employee table, modals
│   │   ├── layout/               # Header, Sidebar
│   │   ├── payroll/              # PayrollSlipModal (split into 5 files)
│   │   ├── auth/                 # AuthGuard
│   │   └── ui/                   # Reusable UI components
│   │
│   ├── hooks/                    # TanStack Query hooks (10 hook files)
│   │   ├── useEmployees.ts
│   │   ├── usePayroll.ts
│   │   ├── useStatistics.ts
│   │   ├── useCompanies.ts
│   │   ├── useSettings.ts
│   │   ├── useAuth.ts
│   │   ├── useAdditionalCosts.ts  # Additional costs CRUD
│   │   ├── useAgentCommissions.ts # Agent commission queries
│   │   └── index.ts              # Aggregated exports
│   │
│   └── lib/
│       ├── api.ts                # API client
│       ├── config.ts             # Frontend configuration
│       └── utils.ts              # Utilities (comparePeriods, etc.)
│
└── arari_pro.db                  # SQLite database (dev only)
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
| ≥12% | Excellent | Emerald |
| 10-12% | Good | Green |
| 7-10% | Needs Improvement | Orange |
| <7% | Critical | Red |

**Important**: Manufacturing dispatch target is **12%** (4-tier system).

> ⚠️ **DO NOT MODIFY THESE VALUES** - The margin target (12%) and tier ranges (<7%, 7-10%, 10-12%, >12%) are final and should NOT be changed unless explicitly requested by the user. These values are configured in multiple files (appStore.ts, MarginGaugeChart.tsx, settings/page.tsx, etc.) and must remain synchronized.

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

### 9. Admin-Only Pages
Upload and Templates pages are restricted to admin users only:
```typescript
// In Sidebar.tsx - Bottom navigation only shown to admins
{isAdmin && bottomNavigation.map((item) => {
  // Upload, Templates, Settings links
})}
```
Non-admin users won't see these navigation items and will be redirected if they try to access directly.

### 10. Dual-Mode Database (SQLite/PostgreSQL)
Backend supports both SQLite (local development) and PostgreSQL (production):
```python
# database.py - Automatic detection
DATABASE_URL = os.environ.get("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith("postgresql://")

# Query adaptation for cross-database compatibility
def _q(query: str) -> str:
    """Convert SQLite ? placeholders to PostgreSQL %s if needed"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query
```

## Known Issues

### ESLint Circular Structure Warning
During the build, `ESLint: Converting circular structure to JSON` may appear - this is a cosmetic Next.js internal warning that can be ignored. The build completes successfully.

### Package Manager
Use **npm** (not Yarn). Configured in `package.json` with `"packageManager": "npm@10.9.2"`.

## Database Tables

### employees
- `employee_id` (PK), `name`, `name_kana`, `dispatch_company` (派遣先)
- `hourly_rate` (時給), `billing_rate` (単価 - what we charge client)
- `nationality` - Used for agent commission calculations
- `status` (active/inactive), `hire_date`, `department`

### payroll_records
- `employee_id`, `period` (composite PK, e.g., "2025年10月")
- Hours: `work_hours`, `overtime_hours`, `overtime_over_60h`, `night_hours`, `holiday_hours`
- Days: `work_days`, `paid_leave_days`, `absence_days`
- Salary: `base_salary`, `gross_salary`, `net_salary`
- Insurance: `social_insurance`, `welfare_pension`, `employment_insurance`
- Company costs: `company_social_insurance`, `company_employment_insurance`, `company_workers_comp`
- Results: `billing_amount`, `total_company_cost`, `gross_profit`, `profit_margin`

### company_additional_costs
- `id` (PK), `dispatch_company`, `period`
- `cost_type` (transport_bus, parking, facility, equipment, uniform, training, meal, other)
- `amount`, `notes`, `created_by`, `created_at`, `updated_at`
- Unique constraint: (dispatch_company, period, cost_type)

### agent_commission_records
- `id` (PK), `agent_id`, `period`, `dispatch_company`
- `total_employees`, `vietnam_normal`, `vietnam_reduced`, `other_count`
- `total_amount`, `breakdown`, `notes`, `calculated_at`
- `registered_to_costs`, `cost_id` - Links to company_additional_costs
- Unique constraint: (agent_id, period, dispatch_company)

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
Production: `https://arari-prov20-production.up.railway.app/api/`

### Key Endpoints
| Category | Endpoints |
|----------|-----------|
| Employees | `/employees` - CRUD operations |
| Payroll | `/payroll`, `/payroll/periods` - Records and periods |
| Statistics | `/statistics` - Dashboard stats (cached) |
| Upload | `/upload` - Excel file upload (admin only) |
| Auth | `/auth/login`, `/auth/logout`, `/auth/me` |
| Reports | `/reports/download/{type}` - Excel download |
| Additional Costs | `/additional-costs` - Cost tracking |
| Agent Commissions | `/agent-commissions/calculate`, `/agent-commissions/register` |
| Companies | `/companies`, `/companies/toggle` - Company management |
| Settings | `/settings` - System configuration |

## Reports System

### Report Types
| Report ID | API Type | Description |
|-----------|----------|-------------|
| `monthly-profit` | `monthly` | 月次粗利レポート - Monthly profit by employee |
| `employee-detail` | `all-employees` | 従業員別詳細レポート - All employees with costs/profit |
| `company-analysis` | `all-companies` | 派遣先別分析レポート - Companies aggregated analysis |
| `cost-breakdown` | `cost-breakdown` | コスト内訳レポート - Detailed insurance/cost breakdown |
| `summary-report` | `summary` | 経営サマリーレポート - Executive summary with rankings |

### Reports API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/download/{type}` | GET | Download Excel report |
| `/api/reports/monthly/{period}` | GET | Get monthly report data |
| `/api/reports/history` | GET | Get report generation history |

### Download Report Example
```bash
# Download monthly profit report for a specific period
curl -o report.xlsx "http://localhost:8000/api/reports/download/monthly?format=excel&period=2025年1月"

# Download all employees report
curl -o employees.xlsx "http://localhost:8000/api/reports/download/all-employees?format=excel&period=2025年1月"

# Download cost breakdown report
curl -o costs.xlsx "http://localhost:8000/api/reports/download/cost-breakdown?format=excel&period=2025年1月"
```

### Report Data Methods (reports.py)
| Method | Returns |
|--------|---------|
| `get_monthly_report_data(period)` | Summary + by_company + top/bottom performers |
| `get_all_employees_report_data(period)` | All employees with hours, salary, costs, profit |
| `get_all_companies_report_data(period)` | Companies aggregated: count, revenue, cost, profit |
| `get_cost_breakdown_report_data(period)` | Insurance details per employee |
| `get_summary_report_data(period)` | Executive summary with rankings |

### Frontend Period Selection
Reports page (`/reports`) includes period selector to choose which month to download:
```typescript
// Report type mapping in page.tsx
const reportTypeMap: Record<string, string> = {
  'monthly-profit': 'monthly',
  'employee-detail': 'all-employees',
  'company-analysis': 'all-companies',
  'cost-breakdown': 'cost-breakdown',
  'summary-report': 'summary',
}
```

### Key Implementation Files
| File | Purpose |
|------|---------|
| `arari-app/api/reports.py` | Report data queries + Excel generation |
| `arari-app/api/main.py` | Download endpoint routing |
| `arari-app/src/app/reports/page.tsx` | Reports UI with period selector |

## Additional Costs System (追加コスト)

Company-specific costs like transport buses (送迎バス) that reduce profit. These are tracked separately and deducted from company profit calculations.

### Cost Types
| ID | Japanese Label | Description |
|----|----------------|-------------|
| `transport_bus` | 送迎バス | Employee shuttle bus |
| `parking` | 駐車場代 | Parking fees |
| `facility` | 施設利用費 | Facility usage |
| `equipment` | 設備費 | Equipment costs |
| `uniform` | ユニフォーム | Work uniforms |
| `training` | 研修費 | Training expenses |
| `meal` | 食事補助 | Meal subsidies |
| `other` | その他 | Other costs |

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/additional-costs` | GET | List all costs (filter by company/period) |
| `/api/additional-costs` | POST | Create new cost entry |
| `/api/additional-costs/{id}` | GET | Get single cost |
| `/api/additional-costs/{id}` | PUT | Update cost |
| `/api/additional-costs/{id}` | DELETE | Delete cost |
| `/api/additional-costs/summary` | GET | Get summary by company |
| `/api/additional-costs/copy` | POST | Copy costs to new period |

### Frontend Hook
```typescript
import {
  useAdditionalCosts,
  useCreateAdditionalCost,
  useUpdateAdditionalCost,
  useDeleteAdditionalCost,
  useCopyAdditionalCosts,
} from '@/hooks'
```

## Agent Commissions System (仲介手数料)

Calculates commissions for recruitment agents based on employee nationality and attendance. Main use case: Maruyama-san commission for Kato Mokuzai employees.

### Commission Rules (Maruyama)
| Condition | Amount |
|-----------|--------|
| Vietnamese employee, no absence/yukyu | ¥10,000 |
| Vietnamese employee, has absence/yukyu | ¥5,000 |
| Other nationalities | ¥5,000 (always) |

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent-commissions/agents` | GET | List available agents |
| `/api/agent-commissions/calculate` | GET | Calculate commission for agent/period |
| `/api/agent-commissions/register` | POST | Register commission to additional costs |
| `/api/agent-commissions/history` | GET | Get commission registration history |
| `/api/agent-commissions/check-registered` | GET | Check if already registered |

### Frontend Hook
```typescript
import {
  useAgents,
  useAgentCommission,
  useRegisterCommission,
  useCommissionHistory,
  useCheckRegistered,
} from '@/hooks'
```

### Key Implementation
```python
# agent_commissions.py - Commission calculation
AGENT_CONFIGS = {
    "maruyama": {
        "name": "丸山さん",
        "target_companies": ["加藤木材"],
        "rules": {
            "Vietnam": {"normal": 10000, "reduced": 5000},
            "default": {"normal": 5000, "reduced": 5000},
        },
    }
}
```

## Production Deployment (2025-12-26)

### Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://arari-pr-ov2-0.vercel.app |
| **Backend** | https://arari-prov20-production.up.railway.app |
| **API Base** | https://arari-prov20-production.up.railway.app/api/ |

### Production Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@arari-pro.local`

### Dashboards
| Service | Dashboard URL |
|---------|---------------|
| Railway | https://railway.com/project/d24d035e-263e-4761-b726-c0362dbd1263 |
| Vercel | https://vercel.com/jokken79s-projects/arari-pr-ov2-0 |

### Railway Environment Variables
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@arari-pro.local
FRONTEND_URL=https://arari-pr-ov2-0.vercel.app
```

### Vercel Environment Variables
```env
NEXT_PUBLIC_API_URL=https://arari-prov20-production.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

### Deployment Notes
- Both services auto-deploy on push to `main` branch
- Railway: ~2-3 min build time
- Vercel: ~1-2 min build time
- CORS is configured via `FRONTEND_URL` environment variable
- Database: PostgreSQL (Railway managed)
- See `DEPLOY.md` for full deployment guide

## CI/CD

GitHub Actions ejecuta en push/PR a `main` (`.github/workflows/main.yml`):

```bash
# Lo que ejecuta el pipeline:
- Python tests (pytest)
- Frontend tests (npm test)
- Python linter (ruff)
- Frontend linter (npm run lint)
```

## Memory System (Sistema de Memoria)

**IMPORTANTE**: Al inicio de cada sesión, ejecutar `/session-start` o leer estos archivos para tener contexto completo:

```
.claude/memory/
├── CONTEXT.md           # Estado actual del proyecto (LEER PRIMERO)
├── CHANGELOG.md         # Historial de cambios recientes
├── SESSION_LOG.md       # Log de sesiones anteriores
├── KNOWN_ERRORS.md      # Errores conocidos para no repetir
├── ERROR_LOG.md         # Template para errores de runtime
└── BUSINESS_CONTEXT.md  # Contexto de negocio (派遣会社)
```

### Al Final de Cada Sesión

Ejecutar `/update-memory` o actualizar manualmente:
1. Añadir entrada en `CHANGELOG.md` con cambios del día
2. Actualizar estado en `CONTEXT.md`
3. Completar entrada en `SESSION_LOG.md`
4. Documentar errores nuevos en `KNOWN_ERRORS.md`

## Claude Code Skills (Slash Commands)

### Skills de Análisis
| Comando | Descripción |
|---------|-------------|
| `/analyze-margin [período]` | Analiza márgenes de ganancia |
| `/perf-analyze [area]` | Análisis de rendimiento (api/db/frontend/all) |
| `/code-review [branch]` | Revisa código de PR/branch |

### Skills de Desarrollo
| Comando | Descripción |
|---------|-------------|
| `/add-feature [descripción]` | Implementa nueva funcionalidad |
| `/fix-bugs [descripción]` | Encuentra y corrige bugs |
| `/refactor-api [módulo]` | Refactoriza el backend |
| `/optimize-frontend [area]` | Optimiza rendimiento frontend |

### Skills de Operaciones
| Comando | Descripción |
|---------|-------------|
| `/test-suite [area]` | Ejecuta y analiza tests |
| `/deploy-check [env]` | Verifica preparación para deploy |
| `/schema-migrate [action]` | Gestiona migraciones de BD |
| `/backup-db` | Crea backup de base de datos |
| `/update-memory` | Actualiza sistema de memoria |
| `/session-start` | Inicializa sesión con contexto completo |

### Skills de Reportes
| Comando | Descripción |
|---------|-------------|
| `/generate-report [tipo] [período]` | Genera reportes (monthly, employee, company, executive) |
| `/audit-log [filtros]` | Ver logs de auditoría |
| `/check-alerts` | Revisar alertas activas |
| `/validate-data` | Valida integridad de datos |
| `/calculate-roi` | Calcular métricas ROI |

### Skills de Seguridad
| Comando | Descripción |
|---------|-------------|
| `/security-audit [area]` | Auditoría de seguridad |

Ejemplo: `/generate-report monthly 2025年1月`

## Specialized Agents (Subagentes)

Agentes especializados disponibles en `.claude/agents/`:

### Agentes de Dominio
| Agente | Uso |
|--------|-----|
| `frontend-specialist` | Next.js, React, TypeScript, TanStack Query |
| `backend-specialist` | FastAPI, Python, Pydantic, APIs |
| `database-specialist` | SQLite, PostgreSQL, migraciones |
| `security-specialist` | Auth, OWASP, tokens, seguridad |
| `business-logic-specialist` | Fórmulas de nómina, seguros, comisiones |
| `test-specialist` | pytest, Jest, coverage, CI/CD |
| `memory-agent` | Mantiene memoria persistente |

### Agentes de Combate de Debilidades
| Agente | Combate |
|--------|---------|
| `code-validator` | No poder ejecutar código - checklists de validación |
| `auto-tester` | No verificar funcionamiento - comandos de testing |
| `simplicity-agent` | Sobre-ingeniería - principios YAGNI/KISS |
| `business-context-agent` | Falta de contexto - dominio 派遣会社 |

Ver `.claude/AGENTS.md` para documentación completa.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript |
| State | TanStack Query (server), Zustand (client) |
| Charts | Recharts |
| UI | Tailwind CSS, Radix UI, Framer Motion |
| Backend | FastAPI, Python 3.11+ |
| Database | SQLite (dev: `arari-app/api/arari_pro.db`), PostgreSQL (prod: Railway) |
| Excel Parser | openpyxl |

## Excel Parser System

The system uses a hybrid template approach:
1. First upload from a factory: Auto-detect field positions by label matching
2. Subsequent uploads: Use saved template for that factory
3. Fallback: Hardcoded `FALLBACK_ROW_POSITIONS` if detection fails

Templates are stored in `factory_templates` table with field positions and column offsets.

## Japanese Number Formatting (日本語数字フォーマット)

Para reportes y UI, usar formato japonés para dinero:

```python
from japanese_format import format_japanese_yen, format_japanese_yen_short

# Ejemplos:
format_japanese_yen(870000)       # → "87万円"
format_japanese_yen(123456789)    # → "1億2,345万6,789円"
format_japanese_yen_short(870000) # → "87万" (para gráficos)
```

| Valor | Formato Incorrecto | Formato Correcto |
|-------|-------------------|------------------|
| 870,000 | ¥870,000 | 87万円 |
| 10,000,000 | ¥10M | 1,000万円 |
| 100,000,000 | ¥100M | 1億円 |

Ver `arari-app/api/japanese_format.py` para todas las funciones disponibles.

## Centralized Configuration

Las constantes de negocio están centralizadas en `arari-app/api/config.py`:

| Categoría | Constantes |
|-----------|------------|
| `InsuranceRates` | 0.0090 (雇用保険 2025), 0.0030 (労災保険) |
| `BillingMultipliers` | 1.0, 1.25, 1.5, 0.25, 1.35 |
| `BusinessRules` | TARGET_MARGIN_MANUFACTURING = 15.0 |
| `UploadLimits` | MAX_FILE_SIZE = 50MB |
| `ValidationLimits` | Rangos para Pydantic validators |

**Importante**: Al cambiar tasas de seguro, actualizar tanto `config.py` como la tabla `settings` en la BD.

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
| Add/modify reports | `arari-app/api/reports.py`, `arari-app/src/app/reports/page.tsx` |
| Report Excel generation | `arari-app/api/reports.py` (ReportService class) |
| Additional costs logic | `arari-app/api/additional_costs.py` |
| Additional costs UI | `arari-app/src/app/additional-costs/page.tsx` |
| Agent commissions logic | `arari-app/api/agent_commissions.py` |
| Agent commissions UI | `arari-app/src/app/agent-commissions/page.tsx` |
| Budget management | `arari-app/api/budget.py`, `arari-app/src/app/budgets/page.tsx` |
| Navigation sidebar | `arari-app/src/components/layout/Sidebar.tsx` |
| TanStack Query hooks | `arari-app/src/hooks/` (use index.ts for exports) |
| Company analysis | `arari-app/src/app/companies/page.tsx` |
