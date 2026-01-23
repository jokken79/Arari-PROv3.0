# Arari PRO v3.0 - Setup Guide

快速开始指南 | クイックスタートガイド

---

## 📋 前置条件

### 必須
- **Python 3.11+**
- **Node.js 18+** (npm 10.9.2+)
- **Git**
- **SQLite3** (開発) または **PostgreSQL** (本番)

### オプション
- **Docker & Docker Compose** (簡単な起動)
- **Redis** (レート制限用)

---

## 🚀 クイックスタート (5分)

### 1. リポジトリをクローン

```bash
git clone https://github.com/jokken79/arari-pro.git
cd arari-pro
```

### 2. 環境ファイルをセットアップ

```bash
# .env.exampleをコピー
cp arari-app/.env.example arari-app/.env.local
cp arari-app/api/.env.example arari-app/api/.env

# ファイルを編集して設定（オプション）
# デフォルト値で動作します
```

### 3. 依存関係をインストール

```bash
# Backend
cd arari-app/api
pip install -r requirements.txt

# Frontend
cd ../
npm install
# Note: If npm install fails, try: npm install --legacy-peer-deps
```

> **最新情報 (2026-01-23):** package-lock.json が CI/CD 互換性のために再生成されました。npm の問題が発生した場合は、`npm install` の前に `npm cache clean --force` を試してください。

### 4. データベースをセットアップ

```bash
# Backend（SQLiteを使用）
cd arari-app/api
python -c "from database import init_db; init_db()"
```

### 5. 開発サーバーを起動

```bash
# オプション A: 手動で起動（2つのターミナルが必要）

# ターミナル 1 - Backend
cd arari-app/api
python -m uvicorn main:app --reload --port 8000

# ターミナル 2 - Frontend
cd arari-app
npm run dev
```

または

```bash
# オプション B: バッチスクリプト（Windows）
cd arari-app
start-arari.bat
```

### 6. ブラウザでアクセス

```
Frontend: http://localhost:3000
Backend:  http://localhost:8000
API Docs: http://localhost:8000/docs
```

### デフォルト認証情報

```
ユーザー名: admin
パスワード: admin123
```

⚠️ **本番環境では必ず変更してください！**

---

## 📚 詳細セットアップ

### Backend のセットアップ

```bash
cd arari-app/api

# 仮想環境を作成（推奨）
python -m venv venv
source venv/bin/activate  # Linux/Mac
# または
venv\Scripts\activate  # Windows

# 依存関係をインストール
pip install -r requirements.txt

# 開発サーバーを起動
python -m uvicorn main:app --reload --port 8000
```

**API ドキュメント**: http://localhost:8000/docs

### Frontend のセットアップ

```bash
cd arari-app

# Node.js バージョン確認
node --version  # v18.0.0 以上

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

**アプリケーション**: http://localhost:3000

### テストを実行

```bash
# Backend tests
cd arari-app/api
python -m pytest tests/ -v
python -m pytest tests/ -v --cov=. --cov-report=html

# Frontend tests
cd arari-app
npm test

# E2E tests
npm run test:e2e
```

### ビルド

```bash
# Frontend
cd arari-app
npm run build
npm start  # 本番モードで実行
```

---

## 🗄️ データベース

### SQLite（開発）

```bash
# 既存のデータベースをリセット
cd arari-app/api
python -c "import os; os.remove('arari_pro.db') if os.path.exists('arari_pro.db') else None"
python -c "from database import init_db; init_db()"
```

### PostgreSQL（本番）

```bash
# Docker Compose で起動
docker-compose up -d postgres

# 接続文字列を設定
export DATABASE_URL="postgresql://user:password@localhost:5432/arari_pro"

# マイグレーションを実行
alembic upgrade head
```

### データベースシード

```bash
# テストデータを挿入
cd arari-app/api
python scripts/seed_db.py
```

---

## 🔐 二段階認証（2FA）セットアップ

### 有効化

1. ダッシュボードにログイン
2. Settings → 二段階認証 (2FA)
3. 「二段階認証を有効にする」をクリック
4. Google AuthenticatorやAuthyでQRコードをスキャン
5. 6桁のコードを入力して確認
6. バックアップコードを安全に保存

### テスト

```bash
# 2FA エンドポイントのテスト
cd arari-app/api
python -m pytest tests/test_2fa_endpoints.py -v

# TOTP コード生成テスト
python -m pytest tests/test_totp.py -v
```

---

## 🧪 テスト

### ユニットテスト

```bash
# Backend
cd arari-app/api
python -m pytest tests/ -v
python -m pytest tests/ -k "2fa" -v  # 2FAテストのみ

# Frontend
cd arari-app
npm test
npm test -- --testPathPattern="2fa"
```

### E2E テスト

```bash
cd arari-app

# Playwright ブラウザをインストール
npx playwright install

# テストを実行
npm run test:e2e
npx playwright test e2e/2fa-login.spec.ts  # 2FA テストのみ

# UI モードで実行（デバッグ）
npx playwright test --ui
```

### カバレッジレポート

```bash
# Backend
cd arari-app/api
python -m pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html

# Frontend
cd arari-app
npm test -- --coverage
```

---

## 📋 ポート

| サービス | ポート | URL |
|---------|--------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/docs |
| Redis | 6379 | localhost:6379 |
| PostgreSQL | 5432 | localhost:5432 |

---

## 🐛 トラブルシューティング

### ポートが既に使用中

```bash
# Linux/Mac
lsof -i :3000
lsof -i :8000

# Windows
netstat -ano | findstr :3000

# プロセスを強制終了
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

### Python 依存関係エラー

```bash
# 仮想環境を再作成
cd arari-app/api
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### npm 依存関係エラー

```bash
# キャッシュをクリア
cd arari-app
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### データベースエラー

```bash
# SQLite データベースをリセット
cd arari-app/api
rm arari_pro.db
python -c "from database import init_db; init_db()"
```

---

## 📚 リソース

- **API ドキュメント**: http://localhost:8000/docs
- **フロントエンド**: http://localhost:3000
- **GitHub リポジトリ**: https://github.com/jokken79/arari-pro
- **本番デプロイ**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **2FA ユーザーガイド**: [2FA_GUIDE.md](./docs/2FA_GUIDE.md)

---

## ✅ 確認チェックリスト

- [ ] Python 3.11+ がインストール済み
- [ ] Node.js 18+ がインストール済み
- [ ] リポジトリをクローン済み
- [ ] 環境ファイルを設定済み
- [ ] Backend が起動して http://localhost:8000/docs にアクセス可能
- [ ] Frontend が起動して http://localhost:3000 にアクセス可能
- [ ] デフォルト認証情報 (admin/admin123) でログイン可能
- [ ] テストが実行可能

すべてチェックできたら、準備完了です！ 🎉

---

**問題が発生したら**: GitHub Issues で報告してください
https://github.com/jokken79/arari-pro/issues
