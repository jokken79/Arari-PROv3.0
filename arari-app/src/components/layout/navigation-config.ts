import {
  LayoutDashboard,
  Users,
  Building2,
  Upload,
  BarChart3,
  FileText,
  Settings,
  Calendar,
  FileSpreadsheet,
  AlertTriangle,
  Wallet,
  Bus,
  UserCheck,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
}

export const mainNavigation: NavItem[] = [
  {
    name: 'ダッシュボード',
    href: '/',
    icon: LayoutDashboard,
    description: '概要と統計',
  },
  {
    name: '従業員一覧',
    href: '/employees',
    icon: Users,
    description: '派遣社員管理',
  },
  {
    name: '派遣先企業',
    href: '/companies',
    icon: Building2,
    description: '取引先別分析',
  },
  {
    name: '月次分析',
    href: '/monthly',
    icon: Calendar,
    description: '月別比較',
  },
  {
    name: '給与明細データ',
    href: '/payroll',
    icon: BarChart3,
    description: 'データ検証',
  },
  {
    name: '詳細レポート',
    href: '/reports',
    icon: FileText,
    description: '帳票出力',
  },
  {
    name: 'アラート管理',
    href: '/alerts',
    icon: AlertTriangle,
    description: '警告・通知',
  },
  {
    name: '予算管理',
    href: '/budgets',
    icon: Wallet,
    description: '予算vs実績',
  },
  {
    name: '追加コスト',
    href: '/additional-costs',
    icon: Bus,
    description: '送迎バス等',
  },
  {
    name: '仲介手数料',
    href: '/agent-commissions',
    icon: UserCheck,
    description: 'エージェント報酬',
  },
]

export const adminNavigation: NavItem[] = [
  {
    name: '給与明細アップロード',
    href: '/upload',
    icon: Upload,
  },
  {
    name: 'テンプレート管理',
    href: '/templates',
    icon: FileSpreadsheet,
  },
  {
    name: '設定',
    href: '/settings',
    icon: Settings,
  },
]
