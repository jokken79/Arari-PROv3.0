# Arari PRO v3.0 - Monitoring & Observability Guide

本番環境監視・可観測性ガイド

---

## 📌 Important Notes (Updated 2026-01-23)

### ✅ Production Ready Status
- GitHub Actions CI/CD pipeline is fully operational
- Monitoring infrastructure recommendations below are ready to be implemented
- Both Railway (backend) and Vercel (frontend) are configured for auto-deployment
- Follow this guide BEFORE deploying to set up comprehensive monitoring

---

## 📊 Monitoring Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Arari PRO Monitoring                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Error Tracking   │  │ Session Replay   │                 │
│  │   (Sentry)       │  │  (LogRocket)     │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│           └──────┬───────────────┘                           │
│                  │                                           │
│          ┌───────▼──────────┐                               │
│          │  Observability   │                               │
│          │   Dashboard      │                               │
│          └──────────────────┘                               │
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ Code Coverage    │  │ Uptime Monitoring│                 │
│  │  (Codecov)       │  │ (UptimeRobot)    │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                      │                           │
│           └──────┬───────────────┘                           │
│                  │                                           │
│          ┌───────▼──────────┐                               │
│          │ GitHub Actions   │                               │
│          │  Notifications   │                               │
│          └──────────────────┘                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔴 1. Sentry - Error Tracking

### Overview
Sentry captures and tracks all errors, exceptions, and performance issues from both backend and frontend.

**Key Features:**
- Real-time error notifications
- Stack traces with source maps
- Release tracking
- Performance monitoring
- Alerting rules

### Setup - Backend (FastAPI)

#### 1.1 Install Sentry SDK

```bash
pip install sentry-sdk[fastapi]
```

#### 1.2 Initialize in `arari-app/api/main.py`

Add before FastAPI app initialization:

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

# Initialize Sentry
SENTRY_DSN = os.environ.get("SENTRY_DSN")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        profiles_sample_rate=0.1,  # 10% of transactions
        release=os.environ.get("APP_VERSION", "3.0.0"),
        environment=os.environ.get("ENVIRONMENT", "development"),
    )
    logging.info("[Sentry] Error tracking initialized")
else:
    logging.warning("[Sentry] SENTRY_DSN not configured, error tracking disabled")
```

#### 1.3 Add to Environment Variables

**Railway Dashboard → Project Settings → Variables:**

```env
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/project-id
ENVIRONMENT=production
APP_VERSION=3.0.0
```

### Setup - Frontend (Next.js)

#### 2.1 Install Sentry SDK

```bash
cd arari-app
npm install @sentry/nextjs
```

#### 2.2 Initialize in `arari-app/next.config.js`

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // ... your Next.js config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    org: "your-organization",
    project: "arari-pro",
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: false,
    widenClientFileUpload: true,
  },
  {
    hideSourceMaps: true,
  }
);
```

#### 2.3 Create `arari-app/sentry.client.config.js`

```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  release: "3.0.0",
});
```

#### 2.4 Add to Environment Variables

**Vercel Dashboard → Settings → Environment Variables:**

```env
NEXT_PUBLIC_SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=arari-pro
SENTRY_AUTH_TOKEN=your-auth-token
```

### Sentry Dashboard

**Access:** https://sentry.io

**Key Metrics to Monitor:**
- New issues count
- Error rate
- Most frequent errors
- Performance degradation
- User impact

**Setting Up Alerts:**

1. Go to **Alerts → Create Alert Rule**
2. Condition: `Every time an error is seen`
3. Action: `Send to Slack` or `Send to Email`
4. Name: `Arari PRO Production Errors`

---

## 📱 2. LogRocket - Session Replay

### Overview
LogRocket captures user sessions and replays them to understand what went wrong.

**Key Features:**
- Session replay with video playback
- Console logs and errors captured
- Network request inspection
- Redux/Zustand state replay
- Privacy masking for sensitive data

### Setup - Frontend

#### 2.1 Install LogRocket

```bash
cd arari-app
npm install logrocket
```

#### 2.2 Initialize in `arari-app/src/app/layout.tsx` or root component

```typescript
import LogRocket from 'logrocket'
import * as Sentry from "@sentry/nextjs"

// Initialize LogRocket
const logRocketId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID

if (logRocketId) {
  LogRocket.init(logRocketId, {
    console: {
      shouldAggregateConsoleErrors: true,
    },
    network: {
      requestSanitizer: (request) => {
        // Sanitize sensitive headers
        request.headers = {
          ...request.headers,
          'authorization': '[REDACTED]',
          'x-api-key': '[REDACTED]',
        }
        return request
      },
    },
  })

  // Integrate LogRocket with Sentry
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    LogRocket.getSessionURL((sessionURL) => {
      Sentry.captureException(new Error("Session Replay"), {
        tags: {
          session_url: sessionURL,
        },
      })
    })
  }
}
```

#### 2.3 Add to Environment Variables

**Vercel Dashboard → Settings → Environment Variables:**

```env
NEXT_PUBLIC_LOGROCKET_APP_ID=your-org/your-app-id
```

### LogRocket Dashboard

**Access:** https://app.logrocket.com

**Key Metrics:**
- Session recordings
- Error replays
- User journey analysis
- Performance metrics

**Privacy Configuration:**

LogRocket masks sensitive data by default:
- Input values (unless whitelisted)
- Password fields
- Credit card info
- etc.

Add custom masks in configuration:

```typescript
LogRocket.init(appId, {
  dom: {
    inputSanitizer: true,
    // Custom selectors to mask
    maskAllText: false,
    maskAllInputs: true,
  },
})
```

---

## ⏱️ 3. UptimeRobot - Uptime Monitoring

### Overview
UptimeRobot monitors that your services are available 24/7.

**Key Features:**
- Uptime percentage tracking
- Multi-location monitoring
- SSL certificate expiration alerts
- Incident tracking
- Status page integration

### Setup

#### 3.1 Create Account

Go to **https://uptimerobot.com** and sign up for free account.

#### 3.2 Add Monitors

1. Click **Add Monitoring**
2. Configure Backend Monitor:

   | Setting | Value |
   |---------|-------|
   | Monitor Type | HTTPS |
   | Friendly Name | Arari PRO Backend |
   | URL | `https://arari-prov20-production.up.railway.app/api/health` |
   | Check Interval | 5 minutes |
   | HTTP Method | GET |
   | Timeout | 30 seconds |
   | Alert Contacts | Email, Slack |

3. Configure Frontend Monitor:

   | Setting | Value |
   |---------|-------|
   | Monitor Type | HTTPS |
   | Friendly Name | Arari PRO Frontend |
   | URL | `https://arari-pr-ov2-0.vercel.app` |
   | Check Interval | 5 minutes |
   | HTTP Method | GET |

#### 3.3 Alert Configuration

**Email Alerts:**
- Set to your admin email
- Alert on first failure
- Also alert on recovery

**Slack Integration (Optional):**

1. Go to **Settings → Integrations**
2. Select **Slack**
3. Connect your Slack workspace
4. Choose #alerts channel

### UptimeRobot Dashboard

**Access:** https://uptimerobot.com/dashboard

**Key Metrics:**
- Current uptime percentage
- Downtime incidents
- SSL certificate status
- Response times

---

## 📊 4. Codecov - Code Coverage Tracking

### Overview
Codecov tracks test coverage and prevents coverage regressions.

**Key Features:**
- Coverage trending
- Pull request review integration
- Coverage reports
- Archive feature
- Custom thresholds

### Setup - Already Configured in CI/CD

Codecov is integrated in `.github/workflows/main.yml`:

```yaml
- name: Upload Backend Coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./arari-app/api/coverage.xml
    flags: backend
    name: backend-coverage
    fail_ci_if_error: false
```

### Configuration File

`.codecov.yml` is already configured with:

- **Target Coverage:** 70%
- **Patch Coverage:** 70%
- **Changed Files:** 80%
- **Backend flag:** `arari-app/api`
- **Frontend flag:** `arari-app/src`

### Codecov Dashboard

**Access:** https://app.codecov.io/gh/jokken79/arari-pro

**Key Metrics:**
- Overall coverage %
- Trend over time
- Coverage by flag (backend/frontend)
- Commit-level changes
- Pull request reviews

**Coverage Goals:**

| Component | Target | Current |
|-----------|--------|---------|
| Backend | 70% | ~65% (improving) |
| Frontend | 70% | ~50% (needs work) |
| E2E | N/A | 25+ scenarios |

---

## 🔔 5. GitHub Actions - CI/CD Notifications

### Overview
GitHub Actions automatically runs tests and deploys on push to main.

**Pipeline Stages:**

1. **build** (Required to pass)
   - Python tests
   - Frontend tests
   - Linting
   - Build verification

2. **security** (Informational)
   - Safety (Python deps)
   - Bandit (static analysis)
   - npm audit (Node deps)

3. **e2e** (Informational)
   - Playwright tests
   - Report upload

4. **deploy** (On success)
   - Deploy to Railway (backend)
   - Deploy to Vercel (frontend)

### Notification Configuration

#### Email Notifications

GitHub sends emails automatically on:
- Build failure
- Workflow re-run
- Deployment completion

**Configure in:** GitHub Settings → Notifications

#### Slack Notifications (Optional)

Add to `.github/workflows/main.yml`:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Build failed on main branch",
        "blocks": [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*Arari PRO Build Failed*\n${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
          }
        }]
      }
```

Then add `SLACK_WEBHOOK` to GitHub Secrets.

---

## 🚨 6. Alert Strategy & Escalation

### Alert Rules

#### Level 1: Critical (Immediate Action)

| Alert | Action |
|-------|--------|
| Backend down (health check fails) | Wake on-call engineer |
| Frontend deploy fails | Rollback immediately |
| Database connection error | Check Railway status |
| Auth system failure | Notify support team |

#### Level 2: Warning (1 Hour Response)

| Alert | Action |
|-------|--------|
| Error rate > 5% | Investigate in Sentry |
| Coverage regression > 5% | Review PR |
| Performance degradation > 20% | Profile backend |
| Login endpoint slow (> 500ms) | Optimize or scale |

#### Level 3: Info (Plan Next Sprint)

| Alert | Action |
|-------|--------|
| New error (low frequency) | Add to backlog |
| Coverage stalled | Assign to dev |
| Session replay issues | Plan debugging |

### Alert Channels

| Severity | Channel | Who | Response Time |
|----------|---------|-----|----------------|
| Critical | SMS + Slack | On-call | 15 min |
| Warning | Email + Slack | Team | 1 hour |
| Info | Slack | Dev lead | Next day |

---

## 📈 7. Monitoring Dashboard Setup

### Create a Status Page

Use **Atlassian StatusPage** or **GitHub Pages**:

1. Go to https://www.statuspage.io
2. Create new page
3. Add components:
   - Frontend (Vercel)
   - Backend API (Railway)
   - Database (Railway Postgres)
4. Integrate with UptimeRobot for auto-updates

### Create Grafana Dashboard (Advanced)

For detailed metrics, install Grafana:

```bash
# Docker Compose for Grafana + Prometheus
docker-compose up -d grafana prometheus
```

Then:
1. Access Grafana on http://localhost:3000
2. Add Prometheus data source
3. Create dashboard with panels:
   - Request latency
   - Error rate
   - Coverage trend
   - Uptime percentage

---

## 🔐 8. Sensitive Data Handling

### What NOT to Monitor

❌ Do NOT capture:
- User passwords
- API keys/tokens
- Credit card numbers
- Personal information (PII)
- 2FA backup codes
- Session tokens

### Privacy Configuration

**Sentry:**
```python
sentry_sdk.init(
    dsn=SENTRY_DSN,
    before_send=lambda event, hint: None if event.get("level") == "error" and "password" in event else event,
)
```

**LogRocket:**
```typescript
LogRocket.init(appId, {
  network: {
    requestSanitizer: (request) => {
      // Remove auth headers
      delete request.headers['authorization']
      return request
    },
  },
})
```

---

## ✅ 9. Monitoring Checklist

### Initial Setup
- [ ] Sentry backend initialized and configured
- [ ] Sentry frontend initialized and configured
- [ ] LogRocket session replay enabled
- [ ] UptimeRobot monitors created (backend + frontend)
- [ ] Codecov dashboard reviewed
- [ ] GitHub Actions notifications configured

### Daily Checks
- [ ] No critical alerts
- [ ] Error rate < 1%
- [ ] Uptime > 99.9%
- [ ] Response time < 500ms

### Weekly Reviews
- [ ] Codecov coverage trend
- [ ] Sentry top errors review
- [ ] LogRocket session samples reviewed
- [ ] Performance metrics analyzed

### Monthly Reviews
- [ ] Coverage improvement plan
- [ ] Performance bottleneck analysis
- [ ] Alert rules effectiveness review
- [ ] Cost optimization review

---

## 📞 10. Troubleshooting

### Sentry Issues

**Problem:** Errors not appearing in Sentry
```
Solution:
1. Verify SENTRY_DSN environment variable
2. Check app.py initialization
3. Run: curl -I https://your-sentry-dsn.ingest.sentry.io
4. Check browser console for CORS errors
```

**Problem:** Source maps not working
```
Solution:
1. Build frontend with source maps: npm run build
2. Upload source maps to Sentry
3. Configure in next.config.js
4. Verify in Sentry Release settings
```

### LogRocket Issues

**Problem:** Sessions not recording
```
Solution:
1. Check NEXT_PUBLIC_LOGROCKET_APP_ID
2. Verify app is loaded in browser
3. Check browser console for errors
4. Ensure cookies are not disabled
```

### UptimeRobot Issues

**Problem:** False positive downtime alerts
```
Solution:
1. Increase timeout to 60 seconds
2. Change check interval to 10 minutes
3. Add multiple locations
4. Add HTTP code check (expect 200)
```

---

## 🔗 Useful Links

| Service | URL | Purpose |
|---------|-----|---------|
| Sentry | https://sentry.io | Error tracking dashboard |
| LogRocket | https://app.logrocket.com | Session replay dashboard |
| UptimeRobot | https://uptimerobot.com | Uptime monitoring dashboard |
| Codecov | https://app.codecov.io | Coverage tracking dashboard |
| GitHub Actions | https://github.com/jokken79/arari-pro/actions | CI/CD pipeline |
| Railway | https://railway.app | Backend deployment |
| Vercel | https://vercel.com | Frontend deployment |
| StatusPage | https://www.statuspage.io | Public status page |

---

## 📚 Additional Resources

- [Sentry FastAPI Docs](https://docs.sentry.io/platforms/python/integrations/fastapi/)
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [LogRocket Docs](https://docs.logrocket.com/)
- [UptimeRobot API](https://uptimerobot.com/api)
- [Codecov Docs](https://docs.codecov.com/)

---

## 📝 Notes

- **Review this guide quarterly** as services/configurations may change
- **Keep environment variables secure** - never commit tokens to git
- **Rotate API keys annually** for security
- **Archive old data** in Sentry quarterly to manage costs
- **Test monitoring** monthly to ensure alerts work

**Last Updated:** 2026-01-23
