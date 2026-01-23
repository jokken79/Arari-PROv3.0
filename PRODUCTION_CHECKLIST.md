# Arari PRO v3.0 - Production Deployment Checklist

本番環境デプロイ完了チェックリスト

---

## ✅ Pre-Deployment (1-2 days before)

### Code Quality & Testing
- [ ] All tests passing locally (`npm test` + `pytest tests/`)
- [ ] No linting errors (`npm run lint` + `ruff check api`)
- [ ] No security vulnerabilities (`safety check` + `npm audit`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Code coverage > 70% (`pytest --cov`)
- [ ] No merge conflicts on main branch
- [ ] All TODOs and FIXMEs resolved or documented

### Documentation
- [ ] README.md updated
- [ ] SETUP.md complete and tested
- [ ] DEPLOYMENT.md complete
- [ ] MONITORING.md complete
- [ ] API_REFERENCE.md complete
- [ ] .env.example includes all required variables
- [ ] CHANGELOG.md updated

### Infrastructure
- [ ] Railway project created and configured
- [ ] Vercel project created and configured
- [ ] PostgreSQL database provisioned (Railway)
- [ ] Environment variables prepared (not committed to git)
- [ ] SSL certificates valid
- [ ] CDN configured (Vercel)

### Security Review
- [ ] No hardcoded secrets in code
- [ ] No default passwords in production
- [ ] CORS configuration reviewed
- [ ] Rate limiting configured
- [ ] HTTPS enforced
- [ ] CSP headers configured
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

### Monitoring Setup
- [ ] Sentry project created and configured
- [ ] LogRocket project created and configured
- [ ] UptimeRobot monitors created
- [ ] Codecov dashboard reviewed
- [ ] GitHub Actions secrets configured
- [ ] Slack/Email notifications set up

---

## ✅ Deployment Day

### Pre-Deployment (Hour 0)

#### Database
- [ ] PostgreSQL initialized on Railway
- [ ] Database migrations run: `alembic upgrade head`
- [ ] Initial data seeded (admin user, test companies)
- [ ] Database backup created
- [ ] Connection string verified

#### GitHub Configuration
- [ ] All secrets added to GitHub:
  - [ ] `RAILWAY_TOKEN`
  - [ ] `VERCEL_TOKEN`
  - [ ] `CODECOV_TOKEN`
  - [ ] `SLACK_WEBHOOK` (optional)
- [ ] Branch protection rules enabled for `main`
- [ ] Required status checks configured
- [ ] 1 code review requirement set

#### Environment Variables

**Railway Backend:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=[STRONG_PASSWORD]
ADMIN_EMAIL=admin@arari-pro.local
FRONTEND_URL=https://arari-pr-ov2-0.vercel.app
SECRET_KEY=[GENERATE_NEW_KEY]
LOG_LEVEL=INFO
ENVIRONMENT=production
APP_VERSION=3.0.0
SENTRY_DSN=[YOUR_SENTRY_DSN]
REDIS_URL=[OPTIONAL_REDIS_URL]
```

**Vercel Frontend:**
```env
NEXT_PUBLIC_API_URL=https://arari-prov20-production.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_2FA=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
NEXT_PUBLIC_SENTRY_DSN=[YOUR_SENTRY_DSN]
NEXT_PUBLIC_LOGROCKET_APP_ID=[YOUR_LOGROCKET_ID]
```

### Deploy Backend (Hour 1)

- [ ] Push to `main` branch triggers GitHub Actions
- [ ] Build job passes (Python tests + Frontend tests + Linting)
- [ ] Security job completes (Bandit + Safety + npm audit)
- [ ] E2E job passes (Playwright tests)
- [ ] Deploy job runs automatically

**Verification:**
```bash
# Test health endpoint
curl https://arari-prov20-production.up.railway.app/api/health

# Check API docs
curl https://arari-prov20-production.up.railway.app/docs

# Test login endpoint
curl -X POST https://arari-prov20-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"[PASSWORD]"}'
```

- [ ] Backend health check returns 200
- [ ] API documentation accessible
- [ ] Database connection verified
- [ ] Sentry error tracking active

### Deploy Frontend (Hour 2)

- [ ] Vercel build completes (auto-triggered by GitHub Actions)
- [ ] Build output < 1MB
- [ ] No Webpack warnings

**Verification:**
```bash
# Test frontend accessibility
curl https://arari-pr-ov2-0.vercel.app

# Test login page
curl https://arari-pr-ov2-0.vercel.app/login

# Check service worker
curl https://arari-pr-ov2-0.vercel.app/sw.js
```

- [ ] Frontend loads (200 status)
- [ ] Login page accessible
- [ ] Static assets cached
- [ ] LogRocket session capture active

---

## ✅ Post-Deployment (Hour 3+)

### Manual Testing

#### Authentication Flow
- [ ] Login with admin credentials works
- [ ] 2FA setup process works
- [ ] TOTP code verification works
- [ ] Backup code verification works
- [ ] Logout works
- [ ] Session persists across page reload
- [ ] Password change works

#### Core Features
- [ ] Employee list loads
- [ ] Payroll data displays
- [ ] Dashboard charts render
- [ ] Reports download (Excel)
- [ ] Settings page accessible
- [ ] 2FA configuration in settings

#### Monitoring
- [ ] Sentry receives backend errors
- [ ] LogRocket captures session
- [ ] UptimeRobot detects uptime
- [ ] Codecov shows coverage
- [ ] Health endpoint monitored

### Load Testing (Optional, for high-traffic sites)

```bash
# Simple load test with Apache Bench
ab -n 1000 -c 10 https://arari-pr-ov2-0.vercel.app

# Or with wrk for more detail
wrk -t4 -c100 -d30s https://arari-pr-ov2-0.vercel.app
```

- [ ] Response time < 500ms under load
- [ ] Error rate < 0.1%
- [ ] No memory leaks detected

### Production Data

- [ ] Seed test data loaded
- [ ] Sample employees visible
- [ ] Sample payroll records display
- [ ] Sample additional costs visible
- [ ] Reports generate correctly

### Logging & Monitoring

```bash
# Check backend logs
curl https://api.railway.app/v1/logs \
  -H "Authorization: Bearer $RAILWAY_TOKEN"

# Check error rate
# Verify in Sentry dashboard

# Check uptime
# Verify in UptimeRobot dashboard
```

- [ ] No error spikes in logs
- [ ] Error rate < 1%
- [ ] All requests returning expected status codes
- [ ] No 5xx errors in last 1 hour

### User Communication

- [ ] Announce deployment on status page
- [ ] Notify team in Slack
- [ ] Update documentation links if needed
- [ ] Share production URLs with stakeholders

---

## ✅ First 24 Hours Monitoring

### Hourly Checks (First 3 Hours)

- [ ] **:00** - Health check pass
- [ ] **:15** - No critical errors in Sentry
- [ ] **:30** - Response time normal
- [ ] **:45** - Database queries performant

### Continuous Monitoring

- [ ] Error rate dashboard open
- [ ] Uptime monitoring active
- [ ] Session replay working
- [ ] Performance metrics normal

### Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 5% | Investigate immediately |
| Response time | > 1000ms | Check database/API |
| Uptime | < 99% | Check Railway status |
| CPU usage | > 80% | Consider scaling |
| Memory usage | > 90% | Consider scaling |

---

## ✅ Weekly Post-Deployment

### Week 1 Reviews

**Day 1:**
- [ ] No unexpected errors
- [ ] User feedback positive
- [ ] Performance baseline established
- [ ] Monitoring alerts working

**Day 3:**
- [ ] Coverage metrics stable
- [ ] Security scan results reviewed
- [ ] Dependency updates assessed
- [ ] Uptime > 99%

**Day 7:**
- [ ] Full week of data analyzed
- [ ] Cost analysis (Railway/Vercel usage)
- [ ] Performance trends established
- [ ] Bug list prioritized
- [ ] Next sprint planned

---

## 🔧 Rollback Procedure (If Needed)

### Option 1: Quick Rollback (< 5 minutes)

**Backend:**
```bash
# Use Railway dashboard to revert to previous deployment
railway --project [PROJECT_ID] rollback
```

**Frontend:**
```bash
# Use Vercel dashboard to revert to previous deployment
vercel rollback
```

### Option 2: Manual Rollback (if automated fails)

1. Revert main branch commit:
   ```bash
   git revert [BAD_COMMIT]
   git push origin main
   ```

2. Wait for GitHub Actions to redeploy

3. Monitor health endpoints

### Post-Rollback

- [ ] Verify services healthy
- [ ] Notify team
- [ ] Root cause analysis
- [ ] Fix and test locally
- [ ] Re-deploy

---

## 🚨 Emergency Response

### System Down (All Traffic Affected)

1. **Immediate (< 1 min):**
   - [ ] Declare incident in Slack
   - [ ] Assign incident commander
   - [ ] Notify customers

2. **Investigation (< 5 min):**
   - [ ] Check health endpoint
   - [ ] Check Sentry dashboard
   - [ ] Check Railway/Vercel status
   - [ ] Review recent changes

3. **Resolution (< 15 min):**
   - [ ] Decide: Fix or Rollback?
   - [ ] Execute decision
   - [ ] Verify system up
   - [ ] Update status

### High Error Rate (> 10%)

1. **Immediate:**
   - [ ] Check Sentry for error pattern
   - [ ] Check database performance
   - [ ] Check external API dependencies

2. **Resolution:**
   - [ ] Scale up if resource constrained
   - [ ] Deploy hotfix if code issue
   - [ ] Rollback if recent deployment caused

### Database Offline

1. **Check Railway:**
   - [ ] Database status in Railway dashboard
   - [ ] Recent changes to PostgreSQL
   - [ ] Connection pool status

2. **Recovery:**
   - [ ] Restart database service
   - [ ] Restore from backup if needed
   - [ ] Verify data integrity

---

## 📋 Sign-Off

### Deployment Manager
- [ ] Name: ________________
- [ ] Date: ________________
- [ ] Time: ________________
- [ ] Status: ✅ APPROVED / ❌ ROLLED BACK

### Verification Lead
- [ ] Name: ________________
- [ ] Tests passed: ✅ YES / ❌ NO
- [ ] Monitoring active: ✅ YES / ❌ NO
- [ ] Sign-off: ________________

### Incident Commander (If Needed)
- [ ] Name: ________________
- [ ] Issue: ________________
- [ ] Resolution: ________________
- [ ] RCA due: ________________

---

## 📚 Resources

| Resource | Location |
|----------|----------|
| Deployment Guide | ./DEPLOYMENT.md |
| Setup Guide | ./SETUP.md |
| Monitoring Guide | ./MONITORING.md |
| API Reference | ./API_REFERENCE.md |
| GitHub Repo | https://github.com/jokken79/arari-pro |
| Railway Dashboard | https://railway.app |
| Vercel Dashboard | https://vercel.com |
| Sentry Dashboard | https://sentry.io |

---

## 📞 Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | | | |
| Tech Lead | | | |
| Product Manager | | | |
| DevOps Lead | | | |

---

## ✨ Post-Deployment

After successful deployment and stabilization (24-48 hours):

1. [ ] Congratulations! 🎉
2. [ ] Document lessons learned
3. [ ] Update runbooks
4. [ ] Plan continuous improvements
5. [ ] Schedule postmortem if issues occurred

---

**Deployment Date:** _______________
**Go-Live Time:** _______________
**Deployment Version:** v3.0.0
**Last Updated:** 2026-01-23
