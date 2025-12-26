# Deployment Guide - 粗利 PRO v2.0

## Architecture Overview

```
┌─────────────────┐         ┌─────────────────┐
│     Vercel      │  API    │  Railway/Render │
│   (Frontend)    │ ──────▶ │    (Backend)    │
│    Next.js      │         │ FastAPI+Postgres│
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
   arari-app/                 arari-app/api/
```

---

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 1.2 Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `jokken79/Arari-PROv2.0`
4. Railway will auto-detect the Python app

### 1.3 Configure Railway
1. Go to project Settings
2. Set **Root Directory**: `arari-app/api`
3. Add PostgreSQL database:
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-sets `DATABASE_URL`

### 1.4 Set Environment Variables
In Railway dashboard, add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `ADMIN_USERNAME` | `admin` | Initial admin user |
| `ADMIN_PASSWORD` | `YourSecurePassword123!` | **Change this!** |
| `ADMIN_EMAIL` | `admin@yourcompany.com` | Admin email |
| `FRONTEND_URL` | `https://arari-pro.vercel.app` | Your Vercel URL |
| `SECRET_KEY` | `your-random-secret-key-here` | For JWT tokens |

### 1.5 Get Backend URL
After deploy, copy your Railway URL:
```
https://arari-pro-backend-production.up.railway.app
```

---

## Step 2: Deploy Frontend to Vercel

### 2.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 2.2 Import Project
1. Click "Add New" → "Project"
2. Import `jokken79/Arari-PROv2.0`
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `arari-app`

### 2.3 Set Environment Variables
In Vercel dashboard, add these variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-railway-url.up.railway.app` |
| `NEXT_PUBLIC_ENABLE_AUTH` | `true` |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` |

### 2.4 Deploy
Click "Deploy" and wait for build to complete.

---

## Step 3: Configure CORS

Update Railway backend to allow Vercel frontend.

The backend auto-configures CORS from `FRONTEND_URL` environment variable.

---

## Step 4: Migrate Data (Optional)

If you have existing SQLite data to migrate:

### Export from SQLite
```bash
cd arari-app/api
python migrate_to_postgres.py --export
# Creates: data_export.json
```

### Import to PostgreSQL
```bash
# Set DATABASE_URL to your Railway PostgreSQL
export DATABASE_URL="postgresql://..."
python migrate_to_postgres.py --import data_export.json
```

---

## Environment Variables Summary

### Backend (Railway)
```env
DATABASE_URL=postgresql://... (auto-set by Railway)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=SecurePassword123!
ADMIN_EMAIL=admin@example.com
FRONTEND_URL=https://arari-pro.vercel.app
SECRET_KEY=your-32-char-random-string
```

### Frontend (Vercel)
```env
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify `DATABASE_URL` is set
- Ensure PostgreSQL addon is provisioned

### CORS errors
- Verify `FRONTEND_URL` in Railway matches Vercel domain
- Check if using `https://` (not `http://`)

### Auth not working
- Verify `NEXT_PUBLIC_API_URL` points to Railway backend
- Check `NEXT_PUBLIC_ENABLE_AUTH=true`
- Verify admin credentials in Railway env vars

### Database connection fails
- Railway PostgreSQL may take 1-2 min to provision
- Check `DATABASE_URL` format starts with `postgresql://`

---

## Cost Estimate

| Service | Free Tier | Paid |
|---------|-----------|------|
| Vercel | 100GB bandwidth/month | $20/month |
| Railway | $5 credit/month | ~$5-10/month |
| **Total** | **Free for low usage** | **~$25/month** |

---

## Alternative: Render.com

If Railway doesn't work, use Render:

1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Set Root Directory: `arari-app/api`
5. Add PostgreSQL database
6. Same environment variables as Railway

Render free tier: 750 hours/month (spins down after inactivity)
