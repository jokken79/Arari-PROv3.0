# 粗利 PRO - 派遣社員利益管理システム

**Profit Margin Management System for Dispatch Employees**

派遣社員の利益率・マージンを可視化するダッシュボードアプリケーション。
製造派遣（製造業向け人材派遣）に特化した粗利計算システム。

## 機能

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

## 計算式

### 請求金額の計算（Billing Multipliers）
```
基本労働:     労働時間 × 単価 × 1.0
残業(≤60h):   残業時間 × 単価 × 1.25
残業(>60h):   60H超残業 × 単価 × 1.5
深夜割増:     深夜時間 × 単価 × 0.25 (追加分)
休日:         休日時間 × 単価 × 1.35

請求金額 = 基本 + 残業 + 60H超 + 深夜 + 休日
```

### 会社総コストの計算（2024年度）
```
会社総コスト = 総支給額
             + 社会保険(会社負担)      ← 本人負担と同額
             + 雇用保険(0.95%)         ← 総支給額ベース
             + 労災保険(0.3%)          ← 製造業の場合
             + 有給コスト              ← 有給時間 × 時給
```

### 粗利計算
```
粗利 = 請求金額 - 会社総コスト
マージン率 = 粗利 / 請求金額 × 100
```

### 保険料率（2024年度）
| 項目 | 料率 | 備考 |
|------|------|------|
| 社会保険（会社負担）| 本人と同額 | 労使折半（健康保険+厚生年金）|
| 雇用保険（会社負担）| 0.95% | 総支給額ベース |
| 労災保険 | 0.3% | 製造派遣業の場合 |

### マージン目標（製造派遣業界標準）
| マージン | 評価 | 色 |
|----------|------|-----|
| ≥18% | 優秀 | 🟢 エメラルド |
| 15-18% | 目標達成 | 🟢 グリーン |
| 12-15% | 目標近い | 🟡 アンバー |
| 10-12% | 要改善 | 🟠 オレンジ |
| <10% | 標準以下 | 🔴 レッド |

> **Note**: 製造派遣の業界標準マージンは10-18%。事務派遣やIT派遣は25%以上が一般的。

## データベース構造

### employees テーブル
| カラム | 説明 |
|--------|------|
| employee_id | 従業員ID (例: "250213") |
| name | 氏名 |
| dispatch_company | 派遣先企業名 |
| hourly_rate | 時給（会社が払う金額）|
| billing_rate | **単価**（派遣先に請求する金額）|

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
| billing_amount | 請求金額 |
| total_company_cost | 会社総コスト |
| gross_profit | 粗利 |
| profit_margin | マージン率 % |

## 技術スタック

### フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts (グラフ)
- Framer Motion (アニメーション)
- Zustand (状態管理)

### バックエンド
- FastAPI (Python)
- SQLite
- Pandas / OpenPyXL (Excel処理)

## インストール

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

ブラウザで http://localhost:3000 を開く

## API エンドポイント

| エンドポイント | 説明 |
|---------------|------|
| `GET /api/statistics` | ダッシュボード統計 |
| `GET /api/employees` | 従業員一覧 |
| `GET /api/payroll` | 給与明細一覧 |
| `GET /api/payroll/periods` | 利用可能な期間 |
| `POST /api/upload` | Excelアップロード |
| `GET /api/statistics/companies` | 派遣先別統計 |

## 用語集

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 単価 | billing_rate | 派遣先への請求単価（円/時間）|
| 時給 | hourly_rate | 従業員への支払い単価 |
| 総支給額 | gross_salary | 基本給+残業+手当の合計 |
| 粗利 | gross_profit | 請求金額 - 会社総コスト |
| 派遣先 | dispatch_company | 従業員の勤務先企業 |
| 製造派遣 | manufacturing dispatch | 製造業向け人材派遣 |

## 変更履歴

### 2025-12-05
- 粗利計算式を日本の派遣業界標準に修正
- 雇用保険率を0.6%→0.95%に修正（2024年度）
- 労災保険(0.3%)を追加
- 請求金額の自動計算機能を追加（深夜・休日・60H超対応）
- マージン目標を25%→15%に変更（製造派遣標準）
- 新規チャート追加:
  - MarginGaugeChart（マージンゲージ）
  - EmployeeRankingChart（従業員ランキング）
  - FactoryComparisonChart（派遣先比較）
  - HoursBreakdownChart（時間内訳）
  - MonthlyTrendChart（月次推移）
  - MonthlySummaryTable（月別サマリー）

## ライセンス

Internal Use Only

---

開発: 2025 | ユニバーサル企画株式会社
