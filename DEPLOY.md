# Deployment Guide - 粗利 PRO v2.0

## Current Production Deployment (2025-12-26)

### Live URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend (Vercel)** | https://arari-pr-ov2-0.vercel.app | Active |
| **Backend (Railway)** | https://arari-prov20-production.up.railway.app | Active |
| **PostgreSQL** | Railway Internal | Active |

### Login Credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |
| Email | `admin@arari-pro.local` |

> **IMPORTANT**: Change the password in production!

---

## Architecture Overview

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│          Vercel                 │         │           Railway               │
│  arari-pr-ov2-0.vercel.app      │  API    │  arari-prov20-production.up...  │
│        (Frontend)               │ ──────▶ │         (Backend)               │
│        Next.js 14               │         │     FastAPI + PostgreSQL        │
└─────────────────────────────────┘         └─────────────────────────────────┘
        │                                           │
        │                                           │
   arari-app/                                 arari-app/api/
   (Root: arari-app)                          (Root: arari-app/api)
```

---

## Railway Configuration

### Project Details

| Field | Value |
|-------|-------|
| Project Name | `imaginative-quietude` |
| Project ID | `d24d035e-263e-4761-b726-c0362dbd1263` |
| Service Name | `Arari-PROv2.0` |
| Service ID | `ffbb2bb1-5fcd-4dbb-88ce-b8355c96e8cb` |
| Environment | `production` |
| Region | `us-east4-eqdc4a` |
| Dashboard | https://railway.com/project/d24d035e-263e-4761-b726-c0362dbd1263 |

### Railway Environment Variables

```env
# Auto-set by Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Manual configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@arari-pro.local
FRONTEND_URL=https://arari-pr-ov2-0.vercel.app
```

### Railway Service Configuration

| Setting | Value |
|---------|-------|
| Root Directory | `arari-app/api` |
| Build Command | Nix Packages (auto-detected) |
| Start Command | `python -c "from database import init_db; init_db()" && uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/api/health` |

### PostgreSQL Database

| Field | Value |
|-------|-------|
| Service | `Postgres` |
| Volume | `postgres-volume` |
| Connection | Referenced via `${{Postgres.DATABASE_URL}}` |

---

## Vercel Configuration

### Project Details

| Field | Value |
|-------|-------|
| Project Name | `arari-pr-ov2-0` |
| Framework | Next.js |
| Dashboard | https://vercel.com/jokken79s-projects/arari-pr-ov2-0 |

### Vercel Environment Variables

```env
NEXT_PUBLIC_API_URL=https://arari-prov20-production.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

### Build Configuration

| Setting | Value |
|---------|-------|
| Root Directory | `arari-app` |
| Framework Preset | Next.js |
| Build Command | `next build` (default) |
| Output Directory | `.next` (default) |

---

## CORS Configuration

The backend reads `FRONTEND_URL` from environment variables and adds it to allowed CORS origins.

**Code location**: `arari-app/api/main.py` (lines 259-282)

```python
# CORS middleware for React frontend
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
cors_origins = []

if FRONTEND_URL:
    cors_origins.append(FRONTEND_URL)
    # Also allow without trailing slash
    ...

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Deployment Process

### Automatic Deployments

Both Railway and Vercel are connected to GitHub and auto-deploy on push to `main` branch.

| Service | Trigger | Branch |
|---------|---------|--------|
| Railway | Git push | `main` |
| Vercel | Git push | `main` |

### Manual Deployment Steps

#### Backend (Railway)
1. Push changes to `main` branch
2. Railway auto-detects and builds
3. New deployment becomes active (~2-3 min)
4. Check logs at Railway dashboard

#### Frontend (Vercel)
1. Push changes to `main` branch
2. Vercel auto-builds Next.js app
3. Preview deployed, then promoted to production
4. Check deployment at Vercel dashboard

---

## Data Migration (SQLite to PostgreSQL)

### Export from SQLite
```bash
cd arari-app/api
python migrate_to_postgres.py --export
# Creates: data_export.json
```

### Import to PostgreSQL
```bash
# Get DATABASE_URL from Railway dashboard
export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
python migrate_to_postgres.py --import data_export.json
```

---

## Troubleshooting

### CORS Errors (400 Bad Request on OPTIONS)
**Symptom**: Login fails, console shows CORS errors
**Solution**:
1. Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
2. Must include `https://` and no trailing slash
3. Redeploy backend after changing

### Login Not Working
**Check**:
1. `NEXT_PUBLIC_API_URL` points to Railway backend
2. `NEXT_PUBLIC_ENABLE_AUTH=true` in Vercel
3. Admin credentials match in Railway env vars
4. Backend is "Online" in Railway dashboard

### Database Connection Fails
**Check**:
1. PostgreSQL addon is provisioned in Railway
2. `DATABASE_URL` uses `${{Postgres.DATABASE_URL}}` reference
3. Wait 1-2 min after provisioning for DB to be ready

### Backend Won't Start
**Check Railway logs for**:
- Missing dependencies in `requirements.txt`
- Database initialization errors
- Port binding issues

---

## Important Files

| File | Purpose |
|------|---------|
| `arari-app/api/main.py` | FastAPI backend, CORS config |
| `arari-app/api/database.py` | Database initialization |
| `arari-app/api/database_config.py` | SQLite/PostgreSQL dual support |
| `arari-app/api/auth.py` | Authentication logic |
| `arari-app/api/Procfile` | Railway start command |
| `arari-app/api/requirements.txt` | Python dependencies |
| `arari-app/src/hooks/useAuth.ts` | Frontend auth hook |
| `arari-app/src/components/auth/AuthGuard.tsx` | Auth protection |

---

## Cost Estimate

| Service | Free Tier | Current Usage |
|---------|-----------|---------------|
| Vercel | 100GB bandwidth/month | Within free tier |
| Railway | $5 credit/month | ~$5-10/month |
| **Total** | **Free for low usage** | **~$5-10/month** |

---

## Change History

| Date | Change | Commit |
|------|--------|--------|
| 2025-12-26 | Initial production deployment | Various |
| 2025-12-26 | Fixed CORS for production frontend | `7044795` |
| 2025-12-26 | Changed admin password to `admin123` | Railway env |

---

## Emergency Contacts

| Service | Support |
|---------|---------|
| Railway | https://railway.app/help |
| Vercel | https://vercel.com/help |
| GitHub Repo | https://github.com/jokken79/Arari-PROv2.0 |

---

## Backup Procedures

### Database Backup
Railway PostgreSQL includes automatic backups. For manual backup:
```bash
# Get connection string from Railway
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Code Backup
All code is version controlled in GitHub. The `main` branch is protected.

---

## Alternative Deployment: Render.com

If Railway becomes unavailable:

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo `jokken79/Arari-PROv2.0`
4. Set Root Directory: `arari-app/api`
5. Add PostgreSQL database
6. Set same environment variables as Railway
7. Update `NEXT_PUBLIC_API_URL` in Vercel to new Render URL
8. Update `FRONTEND_URL` in Render to Vercel URL

Render free tier: 750 hours/month (spins down after 15 min inactivity)
