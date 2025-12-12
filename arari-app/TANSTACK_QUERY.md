# TanStack Query Implementation Guide

## 概要

粗利 PRO v2.0 では、データフェッチングに **TanStack Query (React Query)** を導入しました。
これにより、以下のメリットが得られます：

- 🔄 自動的なキャッシング・リフェッチング
- ⚡ パフォーマンスの向上
- 🎯 シンプルなAPI呼び出し
- 🔌 サーバー状態とクライアント状態の分離
- 🛠️ 強力な開発者ツール（DevTools）

## セットアップ

### 1. パッケージインストール

```bash
cd arari-app
npm install
```

必要なパッケージ：
- `@tanstack/react-query` v5.62.7
- `@tanstack/react-query-devtools` v5.62.7

### 2. QueryProvider

アプリ全体を `QueryProvider` でラップしています（`src/app/layout.tsx`）：

```tsx
<QueryProvider>
  {children}
</QueryProvider>
```

## カスタムフック一覧

### 従業員関連（useEmployees.ts）

#### `useEmployees(params?)`
従業員一覧を取得

```tsx
import { useEmployees } from '@/hooks/useEmployees'

function EmployeeList() {
  const { data, isLoading, error } = useEmployees({
    search: '田中',        // 検索キーワード（オプション）
    company: '加藤木材工業', // 派遣先でフィルタ（オプション）
    employeeType: 'haken'  // 雇用形態でフィルタ（オプション）
  })

  if (isLoading) return <Loading />
  if (error) return <Error message={error.message} />

  return <Table data={data} />
}
```

#### `useEmployee(employeeId)`
特定の従業員を取得

```tsx
const { data: employee } = useEmployee('250213')
```

#### `useCreateEmployee()`
従業員を作成

```tsx
const createMutation = useCreateEmployee()

createMutation.mutate({
  employee_id: '250213',
  name: '田中太郎',
  dispatch_company: '加藤木材工業',
  hourly_rate: 1200,
  billing_rate: 1700,
})
```

#### `useUpdateEmployee()`
従業員情報を更新

```tsx
const updateMutation = useUpdateEmployee()

updateMutation.mutate({
  employeeId: '250213',
  employee: { /* 更新データ */ }
})
```

#### `useDeleteEmployee()`
従業員を削除

```tsx
const deleteMutation = useDeleteEmployee()
deleteMutation.mutate('250213')
```

---

### 給与明細関連（usePayroll.ts）

#### `usePayrollRecords(params?)`
給与明細一覧を取得

```tsx
import { usePayrollRecords } from '@/hooks/usePayroll'

const { data } = usePayrollRecords({
  period: '2025年1月',    // 期間でフィルタ（オプション）
  employeeId: '250213'    // 従業員IDでフィルタ（オプション）
})
```

#### `usePayrollPeriods()`
利用可能な期間一覧を取得

```tsx
const { data: periods } = usePayrollPeriods()
// ['2024年10月', '2024年11月', '2024年12月', ...]
```

#### `useEmployeePayroll(employeeId)`
特定従業員の給与明細を全期間取得

```tsx
const { data } = useEmployeePayroll('250213')
```

#### `usePeriodPayroll(period)`
特定期間の給与明細を全従業員分取得

```tsx
const { data } = usePeriodPayroll('2025年1月')
```

#### `useCreatePayroll()`
給与明細を作成

```tsx
const createMutation = useCreatePayroll()

createMutation.mutate({
  employee_id: '250213',
  period: '2025年1月',
  work_days: 20,
  work_hours: 160,
  // ...
})
```

---

### 統計データ関連（useStatistics.ts）

#### `useDashboardStats(period?)`
ダッシュボード統計データを取得

```tsx
import { useDashboardStats } from '@/hooks/useStatistics'

const { data: stats } = useDashboardStats('2025年1月')

// stats.total_employees
// stats.average_margin
// stats.profit_trend
// stats.top_companies
```

#### `useMonthlyStats(params?)`
月次統計データを取得

```tsx
const { data } = useMonthlyStats({
  year: 2025,
  month: 1
})
```

#### `useCompaniesStats()`
会社別統計データを取得

```tsx
const { data: companies } = useCompaniesStats()
```

#### `useTrendData(months)`
トレンドデータを取得

```tsx
const { data: trend } = useTrendData(6) // 過去6ヶ月
```

---

### 会社関連（useCompanies.ts）

#### `useCompanies()`
派遣先会社一覧を取得

```tsx
import { useCompanies } from '@/hooks/useCompanies'

const { data: companies } = useCompanies()
// ['加藤木材工業', '株式会社オーツカ', ...]
```

#### `useCompanyEmployees(companyName)`
特定会社の従業員一覧を取得

```tsx
const { data } = useCompanyEmployees('加藤木材工業')
```

#### `useCompanyCount()`
会社数を取得

```tsx
const { data: count } = useCompanyCount()
```

---

## 使用例

### 例1: 従業員一覧ページ

```tsx
'use client'

import { useEmployees } from '@/hooks/useEmployees'

export default function EmployeesPage() {
  const { data: employees, isLoading, error } = useEmployees()

  if (isLoading) return <div>読み込み中...</div>
  if (error) return <div>エラー: {error.message}</div>

  return (
    <div>
      <h1>従業員一覧 ({employees?.length}名)</h1>
      <ul>
        {employees?.map(emp => (
          <li key={emp.employee_id}>{emp.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### 例2: ダッシュボード

```tsx
'use client'

import { useDashboardStats } from '@/hooks/useStatistics'

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) return <Loading />

  return (
    <div>
      <h1>ダッシュボード</h1>
      <div>総従業員数: {stats?.total_employees}</div>
      <div>平均マージン: {stats?.average_margin.toFixed(1)}%</div>
      <div>月間売上: ¥{stats?.total_monthly_revenue.toLocaleString()}</div>
    </div>
  )
}
```

### 例3: 従業員作成フォーム

```tsx
'use client'

import { useCreateEmployee } from '@/hooks/useEmployees'
import { useState } from 'react'

export default function CreateEmployeeForm() {
  const [formData, setFormData] = useState({ /* ... */ })
  const createMutation = useCreateEmployee()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* フォームフィールド */}
      <button
        type="submit"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? '作成中...' : '作成'}
      </button>
    </form>
  )
}
```

---

## キャッシング設定

`QueryProvider` のデフォルト設定（`src/providers/QueryProvider.tsx`）：

```tsx
{
  queries: {
    staleTime: 5 * 60 * 1000,      // 5分間キャッシュ
    refetchOnWindowFocus: true,     // ウィンドウフォーカス時に再取得
    refetchOnMount: false,          // マウント時の再取得を無効化
    retry: 1,                       // 失敗時1回リトライ
  },
  mutations: {
    retry: false,                   // ミューテーションはリトライしない
  },
}
```

---

## DevTools

開発環境では、React Query DevTools が自動的に有効になります。
画面右下のアイコンをクリックすると、キャッシュ状態やクエリ情報を確認できます。

---

## 既存の Zustand Store との共存

現在、TanStack Query と Zustand は共存しています：

- **TanStack Query**: サーバーデータ（従業員、給与明細、統計）
- **Zustand**: クライアント状態（テーマ、フィルタ、UI状態）

段階的に移行することで、既存機能への影響を最小限に抑えています。

---

## トラブルシューティング

### キャッシュが更新されない

ミューテーション後に `invalidateQueries` を使用してキャッシュを無効化しています：

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['employees'] })
}
```

### エラーハンドリング

すべてのミューテーションで toast を使用してエラー通知：

```tsx
onError: (error: Error) => {
  toast.error(`エラー: ${error.message}`)
}
```

---

## 参考リンク

- [TanStack Query 公式ドキュメント](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)

---

**最終更新**: 2025-12-11
**実装者**: Claude Code (TanStack Query Expert)
