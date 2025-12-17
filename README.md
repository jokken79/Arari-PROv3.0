# 粗利 PRO v2.0 - 派遣社員利益管理システム

**Profit Margin Management System for Dispatch Employees**

[![Tests](https://img.shields.io/badge/tests-47%20passed-brightgreen)](./arari-app/api/tests)
[![Frontend](https://img.shields.io/badge/frontend-7.8%2F10-blue)](./arari-app/src)
[![Backend](https://img.shields.io/badge/backend-6.2%2F10-yellow)](./arari-app/api)
[![Security](https://img.shields.io/badge/security-review%20needed-orange)](./CLAUDE.md)

派遣社員の利益率・マージンを可視化するダッシュボードアプリケーション。
製造派遣（製造業向け人材派遣）に特化した粗利計算システム。

## 📊 プロジェクト概要

| 項目 | 値 |
|------|-----|
| **フロントエンド** | Next.js 14.2.35 + TypeScript |
| **バックエンド** | FastAPI + Python 3.11 |
| **データベース** | SQLite (100% ローカル) |
| **総コード行数** | ~20,000 LOC |
| **コンポーネント数** | 45 React components |
| **APIエンドポイント** | 80+ endpoints |
| **テスト** | 47 backend tests passed |

---

## 🎯 主な機能

### ダッシュボード
- **リアルタイム統計** - 月間粗利、売上、コスト、マージン率を一目で確認
- **マージンゲージ** - 目標達成状況をビジュアル表示（製造派遣目標: 15%）
- **従業員ランキング** - トップパフォーマー・要改善リストを表示
- **派遣先比較** - 売上 vs コストを派遣先ごとに比較
- **時間内訳** - 労働時間、残業、深夜、休日のピーチャート

### 月次分析
- **月次推移グラフ** - 売上・コスト・粗利の月別トレンド（棒グラフ + マージン線）
- **月別サマリーテーブル** - 全期間の詳細データと前月比変動
- **期間比較** - 2つの月を選択して比較分析

### Excel アップロード
- **ChinginGenerator形式対応** - 給与明細Excelを自動解析
- **自動請求計算** - 単価×時間×倍率で請求金額を自動計算
- **複数シート処理** - 1ファイルで複数従業員を一括処理
- **テンプレート学習** - 派遣先ごとにExcel形式を記憶

### 追加機能
- **アラート管理** - 低マージン・データ不整合の警告
- **予算管理** - 期間・派遣先ごとの予算設定と比較
- **レポート出力** - Excel/PDF形式でのエクスポート
- **バックアップ** - データベースの自動バックアップ・復元

---

## 📈 品質分析レポート (2025-12-17)

### 総合評価

| カテゴリ | スコア | 状態 |
|----------|--------|------|
| **フロントエンド** | 7.8/10 | ✅ 良好 |
| **バックエンド** | 6.2/10 | ⚠️ 改善が必要 |
| **テストカバレッジ** | ~15% | ⚠️ 拡充が必要 |
| **セキュリティ** | 要レビュー | ⚠️ 本番前に対応必要 |
| **アクセシビリティ** | 8.2/10 | ✅ WCAG 2.1 AA準拠 |

### フロントエンド詳細 (7.8/10)

| 項目 | スコア | 備考 |
|------|--------|------|
| コンポーネント設計 | 7/10 | 一部大きいコンポーネントあり |
| TypeScript | 8.2/10 | `any`は31箇所（Recharts由来が多い） |
| React Patterns | 8.5/10 | Hooks使用は適切 |
| Performance | 7.5/10 | useMemo実装済み |
| アクセシビリティ | 8.2/10 | 138+ aria-labels |
| 状態管理 | 8.8/10 | Zustand + TanStack Query |
| エラーハンドリング | 8/10 | try-catch 39箇所 |

### バックエンド詳細 (6.2/10)

| 項目 | スコア | 備考 |
|------|--------|------|
| 構造 | 6.5/10 | main.py が1838行と大きい |
| Type Hints | 7/10 | Pydantic modelsは良好 |
| Docstrings | 6/10 | 複雑なメソッドに不足 |
| エラーハンドリング | 5/10 | bare except多数 |
| ロギング | 4/10 | print()とlogging()が混在 |
| データベース | 7/10 | SQLite適切、ORM未使用 |
| API設計 | 6/10 | バージョニングなし |

### テスト状況

```
Backend Tests:  47/47 passed ✅
Frontend Tests: 1/1 passed ✅ (Header component)

テストファイル:
├── test_business_rules.py    - 6 tests (請求・コスト計算)
├── test_login.py             - 3 tests (認証)
├── test_main.py              - 1 test (ヘルスチェック)
├── test_reset_db.py          - 5 tests (DB管理)
├── test_api_endpoints.py     - 14 tests (API) [NEW]
├── test_salary_calculations.py - 18 tests (給与計算) [NEW]
```

### セキュリティ課題

| 課題 | 重大度 | 状態 |
|------|--------|------|
| デフォルト管理者パスワード | 🔴 CRITICAL | 未対応 |
| 認証なしのエンドポイント | 🔴 CRITICAL | 未対応 |
| レート制限なし | 🟠 HIGH | 未対応 |
| CORS設定 | 🟡 MEDIUM | 開発用OK |
| SQL Injection | ✅ FIXED | パラメータ化済み |
| Path Traversal | ✅ FIXED | バリデーション済み |

> ⚠️ **本番環境では必ずセキュリティ対応を行ってください**

---

## 🧮 計算式

### 請求金額の計算（Billing Multipliers）
```
基本労働:     労働時間 × 単価 × 1.0
残業(≤60h):   残業時間 × 単価 × 1.25
残業(>60h):   60H超残業 × 単価 × 1.5
深夜割増:     深夜時間 × 単価 × 0.25 (追加分、基本に上乗せ)
休日:         休日時間 × 単価 × 1.35

請求金額 = 基本 + 残業 + 60H超 + 深夜 + 休日
```

### 会社総コストの計算（2025年度）
```
会社総コスト = 総支給額
             + 社会保険(会社負担)      ← 健康保険 + 厚生年金（労使折半）
             + 雇用保険(0.90%)         ← 2025年度率
             + 労災保険(0.30%)         ← 製造業の場合

⚠️ 重要: 有給支給額は総支給額に含まれているため、二重計上しないこと
```

### 粗利計算
```
粗利 = 請求金額 - 会社総コスト
マージン率 = 粗利 / 請求金額 × 100
```

### 保険料率（2025年度）
| 項目 | 料率 | 備考 |
|------|------|------|
| 社会保険（会社負担）| 本人と同額 | 労使折半（健康保険+厚生年金）|
| 雇用保険（会社負担）| **0.90%** | 2025年度（2024年度は0.95%）|
| 労災保険 | 0.30% | 製造派遣業の場合 |

### マージン目標（製造派遣業界標準）
| マージン | 評価 | 色 |
|----------|------|-----|
| ≥18% | 優秀 | 🟢 エメラルド |
| 15-18% | 目標達成 | 🟢 グリーン |
| 12-15% | 目標近い | 🟡 アンバー |
| 10-12% | 要改善 | 🟠 オレンジ |
| <10% | 標準以下 | 🔴 レッド |

> **Note**: 製造派遣の業界標準マージンは10-18%。事務派遣やIT派遣は25%以上が一般的。

---

## 🗄️ データベース構造

### employees テーブル
| カラム | 説明 |
|--------|------|
| employee_id | 従業員ID (例: "250213") |
| name | 氏名 |
| dispatch_company | 派遣先企業名 |
| hourly_rate | 時給（会社が払う金額）|
| billing_rate | **単価**（派遣先に請求する金額）|
| status | 状態 (active/inactive) |
| gender | 性別 (M/F) [NEW] |
| birth_date | 生年月日 [NEW] |
| termination_date | 退社日 [NEW] |

### payroll_records テーブル
| カラム | 説明 |
|--------|------|
| employee_id | 従業員ID |
| period | 期間 (例: "2025年10月") |
| work_hours | 労働時間 |
| overtime_hours | 残業時間 (≤60h部分) |
| overtime_over_60h | 60H超残業 |
| night_hours | 深夜時間 |
| holiday_hours | 休日時間 |
| gross_salary | 総支給額 |
| welfare_pension | 厚生年金 (本人負担) [NEW] |
| billing_amount | 請求金額 |
| total_company_cost | 会社総コスト |
| gross_profit | 粗利 |
| profit_margin | マージン率 % |
| rent_deduction | 家賃/寮費 [NEW] |
| utilities_deduction | 水道光熱費 [NEW] |
| meal_deduction | 弁当代 [NEW] |

---

## 🛠️ 技術スタック

### フロントエンド
| 技術 | バージョン | 用途 |
|------|------------|------|
| Next.js | 14.2.35 | フレームワーク (App Router) |
| React | 18.3.1 | UIライブラリ |
| TypeScript | 5.6.3 | 型安全性 |
| Tailwind CSS | 3.4.14 | スタイリング |
| TanStack Query | 5.62.7 | サーバー状態管理 |
| Zustand | 5.0.0 | クライアント状態管理 |
| Recharts | 2.12.7 | グラフ |
| Framer Motion | 11.11.7 | アニメーション |
| Radix UI | - | UIコンポーネント |

### バックエンド
| 技術 | バージョン | 用途 |
|------|------------|------|
| FastAPI | ≥0.104.0 | Webフレームワーク |
| Python | 3.11+ | 言語 |
| SQLite | 3 | データベース |
| Pydantic | ≥2.5.0 | データ検証 |
| OpenPyXL | ≥3.1.2 | Excel処理 |
| bcrypt | ≥4.0.0 | パスワードハッシュ |

---

## 🚀 インストール

### フロントエンド
```bash
cd arari-app
npm install
npm run dev
```

### バックエンド
```bash
cd arari-app/api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 環境変数 (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_AUTH=false
```

ブラウザで http://localhost:3000 を開く

---

## 🧪 テストの実行

### バックエンド (pytest)
```bash
cd arari-app/api
pip install pytest httpx
python -m pytest tests/ -v
```

### フロントエンド (Jest)
```bash
cd arari-app
npm test
```

---

## 📡 API エンドポイント (80+)

### 主要エンドポイント
| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/employees` | GET/POST | 従業員一覧・作成 |
| `/api/employees/{id}` | GET/PUT/DELETE | 従業員詳細・更新・削除 |
| `/api/payroll` | GET/POST | 給与明細一覧・作成 |
| `/api/statistics` | GET | ダッシュボード統計 |
| `/api/upload` | POST | Excelアップロード |
| `/api/alerts` | GET | アラート一覧 |
| `/api/budgets` | GET/POST | 予算管理 |
| `/api/reports/*` | GET | レポート生成 |
| `/api/auth/login` | POST | ログイン |

---

## 📝 用語集

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 単価 | billing_rate | 派遣先への請求単価（円/時間）|
| 時給 | hourly_rate | 従業員への支払い単価 |
| 総支給額 | gross_salary | 基本給+残業+手当の合計 |
| 粗利 | gross_profit | 請求金額 - 会社総コスト |
| 派遣先 | dispatch_company | 従業員の勤務先企業 |
| 製造派遣 | manufacturing dispatch | 製造業向け人材派遣 |
| 労使折半 | equal split | 会社と従業員で保険料を半分ずつ負担 |

---

## 📋 変更履歴

### 2025-12-17 - v2.0 品質分析・テスト拡充
- 47件のバックエンドテスト追加・全パス
- 給与計算テスト18件追加
- APIエンドポイントテスト14件追加
- セキュリティ分析実施
- README全面更新

### 2025-12-12 - v2.0 モダナイゼーション
- TanStack Query導入（サーバー状態管理）
- アクセシビリティ改善（WCAG 2.1 AA）
- PayrollSlipModal分割（904行→200行）
- useMemo最適化
- Toast通知システム追加

### 2025-12-11 - セキュリティ修正
- SQL Injection対策（LIMIT/OFFSET）
- Path Traversal対策（backup.py）
- 新規従業員フィールド追加
- アラート・予算管理ページ追加

### 2025-12-10 - Parser v4.0
- 厚生年金パース対応
- 有給二重計上バグ修正
- 法定福利費計算修正
- 通勤費二重計上修正

### 2025-12-05 - 初期リリース
- 粗利計算式を日本の派遣業界標準に準拠
- 雇用保険率を0.90%に設定（2025年度）
- マージン目標を15%に設定（製造派遣標準）
- 6種類のチャートコンポーネント追加

---

## ⚠️ 本番環境へのデプロイ前チェックリスト

- [ ] デフォルト管理者パスワードを変更
- [ ] 全エンドポイントに認証を追加
- [ ] レート制限を実装
- [ ] CORS設定を本番用に変更
- [ ] HTTPS有効化
- [ ] 環境変数をシークレット管理に移行
- [ ] ログレベルを本番用に設定
- [ ] バックアップ自動化設定

---

## 📄 ライセンス

Internal Use Only - ユニバーサル企画株式会社

---

開発: 2025 | ユニバーサル企画株式会社
