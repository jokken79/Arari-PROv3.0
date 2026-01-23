# Arari PRO v3.0 - Deployment Guide

本番環境へのデプロイメント手順

---

## 🌍 本番環境アーキテクチャ

```
GitHub (main branch)
        ↓
GitHub Actions CI/CD
├── Tests (Python + Frontend + E2E)
├── Security Scan (Bandit + Safety)
├── Coverage Report (Codecov)
└── Deploy (if all pass)
        ↓
Railway (Backend)
├── PostgreSQL Database
├── Environment Variables
└── Auto Restart on Deploy

        ↓
Vercel (Frontend)
├── Next.js App
├── CDN Global
└── Auto Restart on Deploy
```

---

## 🔑 Step 1: GitHub Secrets 設定

Backend と Frontend のデプロイに必要なトークンを設定します。

### Settings → Secrets and variables → Actions

以下の Secrets を追加:

```
RAILWAY_TOKEN
  値: Railway アカウント → Account Settings → API Token

VERCEL_TOKEN
  値: Vercel アカウント → Settings → Tokens → Create Token

CODECOV_TOKEN
  値: Codecov → Repository settings → Upload Token
```

### 設定方法

```bash
# GitHub CLI を使用（推奨）
gh secret set RAILWAY_TOKEN --body "your-token-value"
gh secret set VERCEL_TOKEN --body "your-token-value"
gh secret set CODECOV_TOKEN --body "your-token-value"

# または手動で Settings → Secrets and variables → Actions に入力
```

---

## 🚀 Step 2: Backend デプロイ (Railway)

### Railway プロジェクト作成

1. https://railway.app にアクセス
2. New Project → GitHub repo から deploy
3. `arari-pro` リポジトリを選択
4. PostgreSQL プラグインを追加
5. Environment Variables を設定

### Environment Variables

Railway Dashboard → Project → Variables:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@arari-pro.local
FRONTEND_URL=https://arari-pr-ov2-0.vercel.app
SECRET_KEY=generate-strong-secret-key
LOG_LEVEL=INFO
```

### デプロイメント

```bash
# 自動デプロイ（main branch へのプッシュで自動実行）
# または手動デプロイ:

# Railway CLI をインストール
npm i -g @railway/cli

# ログイン
railway login

# デプロイ
railway up

# ログを確認
railway logs
```

### 確認

```bash
# Backend が起動しているか確認
curl https://arari-prov20-production.up.railway.app/api/health

# API ドキュメント
https://arari-prov20-production.up.railway.app/docs
```

---

## 🎨 Step 3: Frontend デプロイ (Vercel)

### Vercel プロジェクト作成

1. https://vercel.com にアクセス
2. Add New → Project
3. GitHub から `arari-pro` を選択
4. Framework Preset: **Next.js**
5. Root Directory: **arari-app**

### Environment Variables

Vercel Dashboard → Project Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://arari-prov20-production.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_2FA=true
```

### デプロイメント

```bash
# 自動デプロイ（main branch へのプッシュで自動実行）
# または手動デプロイ:

# Vercel CLI をインストール
npm i -g vercel

# ログイン
vercel login

# デプロイ
vercel --prod

# URL を確認
vercel list
```

### 確認

```bash
# Frontend が起動しているか確認
https://arari-pr-ov2-0.vercel.app

# ログインページ
https://arari-pr-ov2-0.vercel.app/login
```

---

## ✅ Step 4: Branch Protection Rules 設定

GitHub リポジトリの `main` branch を保護します。

### Settings → Branches → Add rule

以下を有効にします:

```
✓ Require pull request reviews before merging (1 reviewer)
✓ Require status checks to pass before merging
  - build (unit + integration tests)
  - security (security scan)
  - e2e (end-to-end tests)
✓ Require branches to be up to date before merging
✓ Dismiss stale pull request approvals when new commits are pushed
✓ Require code reviews from code owners
```

---

## 📊 Step 5: Monitoring & Observability

### Codecov (コード品質)

```bash
# CI/CD で自動アップロード（既に設定済み）
# ダッシュボード: https://app.codecov.io/gh/jokken79/arari-pro
```

### Sentry (エラー追跡)

```bash
# Backend に Sentry を統合
pip install sentry-sdk

# SENTRY_DSN を環境変数に設定
# Railway Dashboard で設定
```

### LogRocket (Session Replay)

```bash
# Frontend に統合済み
# ダッシュボード: https://app.logrocket.com

# Next.js 構成ファイルで設定
NEXT_PUBLIC_LOGROCKET_APP_ID=your-app-id
```

### UptimeRobot (稼働率監視)

```bash
# https://uptimerobot.com で新しいモニターを作成
Monitor Type: HTTPS
URL: https://arari-prov20-production.up.railway.app/api/health
Check interval: 5 minutes
Alert contacts: Email
```

---

## 🔄 Step 6: CD/CD パイプライン確認

### GitHub Actions ワークフロー

```
1. Push to main
   ↓
2. GitHub Actions 実行
   ├── Job: build
   │   ├── Run Python tests
   │   ├── Run Frontend tests
   │   ├── Run linters
   │   ├── Build verification
   │   └── Upload coverage
   ├── Job: security
   │   ├── Python vulnerability scan
   │   ├── Dependency check
   │   └── Upload reports
   ├── Job: e2e
   │   ├── Playwright browser install
   │   └── E2E tests
   └── Job: deploy (if all pass)
       ├── Deploy to Railway
       └── Deploy to Vercel
```

### デプロイメント状態確認

```bash
# GitHub Actions ログ
# https://github.com/jokken79/arari-pro/actions

# Railway デプロイメント
# https://railway.app/project/your-project-id

# Vercel デプロイメント
# https://vercel.com/dashboard
```

---

## 🧪 Step 7: 本番環境テスト

### ヘルスチェック

```bash
# Backend
curl https://arari-prov20-production.up.railway.app/api/health

# Frontend
curl https://arari-pr-ov2-0.vercel.app
```

### ログイン テスト

1. https://arari-pr-ov2-0.vercel.app/login にアクセス
2. 認証情報を入力:
   - ユーザー名: `admin`
   - パスワード: `admin123`
3. ダッシュボードにアクセス可能なことを確認

### 2FA テスト

1. Settings → 二段階認証 に移動
2. 「二段階認証を有効にする」をクリック
3. QR コードをスキャン
4. コードを確認
5. Logout
6. 2FA でログインできることを確認

---

## 🔒 セキュリティ チェックリスト

本番環境での重要なセキュリティ設定:

- [ ] `ADMIN_PASSWORD` を強力なパスワードに変更
- [ ] `SECRET_KEY` を生成済み strong key に設定
- [ ] HTTPS が有効（Railway/Vercel で自動）
- [ ] CORS が正しく設定
- [ ] Rate limiting が有効
- [ ] 2FA が有効化推奨
- [ ] データベースバックアップが設定済み
- [ ] ログ monitoring が有効
- [ ] Error tracking (Sentry) が有効
- [ ] Uptime monitoring が有効

---

## 📈 パフォーマンス最適化

### Backend (Railway)

```env
# メモリ制限
RAILWAY_MEMORY=512MB

# CPU 制限
RAILWAY_CPU=500m

# 接続プール
DATABASE_POOL_SIZE=20
```

### Frontend (Vercel)

```
Edge Functions: 有効
ISR (Incremental Static Regeneration): 設定済み
Image Optimization: 有効
```

### Database (PostgreSQL)

```sql
-- インデックス作成
CREATE INDEX idx_payroll_period ON payroll_records(period);
CREATE INDEX idx_employee_id ON payroll_records(employee_id);

-- クエリ最適化
ANALYZE;
```

---

## 🔄 ロールバック手順

デプロイが失敗した場合:

### Railway

```bash
# 前回のデプロイメントに戻す
railway down
railway logs --service=backend

# または Railway Dashboard で手動で戻す
```

### Vercel

```bash
# 前回のデプロイに戻す
vercel rollback

# または Vercel Dashboard → Deployments → 前回のデプロイをプロモート
```

---

## 📞 トラブルシューティング

### Backend が起動しない

```bash
# Railway ログを確認
railway logs --tail=50

# 環境変数を確認
railway variables ls

# PostgreSQL が起動しているか確認
railway status
```

### Frontend が表示されない

```bash
# Vercel ビルドログ
# Vercel Dashboard → Deployments → 最新デプロイ → Build Logs

# API 接続テスト
# Browser console で確認:
fetch('https://arari-prov20-production.up.railway.app/api/health')
  .then(r => r.json())
  .then(console.log)
```

### 2FA が機能しない

```bash
# Backend 2FA ログを確認
railway logs --service=backend | grep 2fa

# 時刻同期を確認（TOTP は時刻に依存）
date  # システムの現在時刻が正確か確認
```

---

## 📚 リソース

- Railway Dashboard: https://railway.app/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Actions: https://github.com/jokken79/arari-pro/actions
- Codecov: https://app.codecov.io/gh/jokken79/arari-pro
- Sentry: https://sentry.io/welcome/
- LogRocket: https://app.logrocket.com

---

## 次のステップ

1. ✅ GitHub Secrets を設定
2. ✅ Branch Protection Rules を有効化
3. ✅ Railway/Vercel プロジェクトを作成
4. ✅ Environment Variables を設定
5. ✅ Monitoring ツールをセットアップ
6. ✅ 本番環境をテスト
7. ✅ Team に本番 URL を共有

**本番環境 URL:**
- Frontend: https://arari-pr-ov2-0.vercel.app
- Backend API: https://arari-prov20-production.up.railway.app/api/
- API Docs: https://arari-prov20-production.up.railway.app/docs
