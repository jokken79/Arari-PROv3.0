'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  TrendingUp,
  Shield,
  BarChart3,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mounted])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login({ username, password })
      if (result.success) {
        // Check if password change is required
        if (result.mustChangePassword) {
          // Redirect to settings page with password change notice
          window.location.href = '/settings?change_password=required'
        } else {
          // Use full page reload to ensure AuthGuard reads fresh token from localStorage
          window.location.href = '/'
        }
      } else {
        setError(result.error || 'ログインに失敗しました')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const parallaxX = mounted && typeof window !== 'undefined' ? (mousePosition.x - window.innerWidth / 2) / 50 : 0
  const parallaxY = mounted && typeof window !== 'undefined' ? (mousePosition.y - window.innerHeight / 2) / 50 : 0

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"
          style={{
            transform: mounted ? `translate(${parallaxX * 2}px, ${parallaxY * 2}px)` : 'translate(0, 0)',
            transition: mounted ? 'transform 0.3s ease-out' : 'none'
          }}
        />
        <div
          className="absolute top-1/2 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"
          style={{
            transform: mounted ? `translate(${-parallaxX * 1.5}px, ${-parallaxY * 1.5}px)` : 'translate(0, 0)',
            transition: mounted ? 'transform 0.3s ease-out' : 'none',
            animationDelay: '1s'
          }}
        />
        <div
          className="absolute bottom-20 left-1/3 w-72 h-72 bg-gradient-to-br from-emerald-300/15 to-cyan-300/15 rounded-full blur-3xl animate-pulse"
          style={{
            transform: mounted ? `translate(${parallaxX}px, ${parallaxY}px)` : 'translate(0, 0)',
            transition: mounted ? 'transform 0.3s ease-out' : 'none',
            animationDelay: '2s'
          }}
        />
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }} />
        </div>
      </div>

      {/* Left Side - Premium Branding Panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-purple-600/20 animate-pulse" />

        {/* Background Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
          <Image
            src="/logo-uns-corto-negro.png"
            alt="Background watermark"
            fill
            priority
            className="object-contain"
            sizes="100vw"
            style={{
              transform: mounted ? `translate(${parallaxX * -0.5}px, ${parallaxY * -0.5}px) scale(1.3) rotate(-15deg)` : 'translate(0, 0) scale(1.3) rotate(-15deg)',
              transition: mounted ? 'transform 0.3s ease-out' : 'none',
              filter: 'brightness(2) saturate(0.5)',
              mixBlendMode: 'overlay'
            }}
          />
        </div>

        {/* Geometric Shapes */}
        <div className="absolute top-20 right-20 w-64 h-64 border-2 border-blue-400/20 rounded-full"
          style={{
            transform: mounted ? `translate(${parallaxX * 0.8}px, ${parallaxY * 0.8}px)` : 'translate(0, 0)',
            transition: mounted ? 'transform 0.4s ease-out' : 'none'
          }}
        />
        <div className="absolute bottom-40 left-20 w-48 h-48 border-2 border-indigo-400/20 rounded-full"
          style={{
            transform: mounted ? `translate(${-parallaxX * 0.6}px, ${-parallaxY * 0.6}px)` : 'translate(0, 0)',
            transition: mounted ? 'transform 0.4s ease-out' : 'none'
          }}
        />

        <div className="relative z-10 flex flex-col justify-between w-full px-12 xl:px-16 py-12">
          {/* Top Section - Logo & Title */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
              style={{
                transform: mounted ? `translate(${parallaxX * 0.5}px, ${parallaxY * 0.5}px)` : 'translate(0, 0)',
                transition: 'transform 0.2s ease-out'
              }}
            >
              <Image
                src="/logo-uns-corto-negro.png"
                alt="ユニバーサル企画"
                width={280}
                height={70}
                className="w-auto drop-shadow-2xl mb-6"
                style={{ height: '70px' }}
                priority
              />
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white tracking-tight">粗利 PRO</h1>
              </div>
              <p className="text-xl text-slate-300 leading-relaxed max-w-md">
                派遣社員の利益を<span className="text-cyan-400 font-semibold">リアルタイム</span>で分析・管理する次世代プラットフォーム
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3"
            >
              <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 text-white rounded-full text-xs font-bold shadow-xl shadow-cyan-500/40">
                v2.0 Enterprise
              </span>
              <span className="text-sm font-medium text-blue-200">
                製造派遣向け
              </span>
            </motion.div>
          </div>

          {/* Middle Section - Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4 my-8"
          >
            {[
              { icon: Shield, title: '銀行レベルセキュリティ', desc: 'SSL 256-bit暗号化でデータ保護' },
              { icon: BarChart3, title: 'リアルタイム粗利分析', desc: '12%マージン目標をサポート' },
              { icon: Zap, title: '高速パフォーマンス', desc: '959+従業員を瞬時に処理' },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="group flex items-start gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all duration-300"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">{feature.title}</h3>
                  <p className="text-sm text-blue-100/80">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom Section - Stats & Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-6 border-t border-white/10"
          >
            <div className="flex items-center gap-6 text-sm mb-4">
              <div className="flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold">99.9% 稼働率</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-bold">24/7 監視</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="font-bold">ISO認証</span>
              </div>
            </div>
            <p className="text-xs text-blue-200/60">
              © {new Date().getFullYear()} ユニバーサル企画株式会社. All rights reserved.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative lg:px-12">
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-slate-50/50 to-blue-50/30 dark:from-slate-900/80 dark:via-slate-800/50 dark:to-slate-900/30 backdrop-blur-xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 text-center">
            <Image
              src="/logo-uns-corto-negro.png"
              alt="ユニバーサル企画"
              width={200}
              height={50}
              className="h-12 w-auto mx-auto mb-4 dark:invert"
              priority
            />
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                粗利 PRO
              </span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white dark:bg-slate-800/90 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-black/30 p-8 backdrop-blur-xl border border-slate-100 dark:border-slate-700/50">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
                ログイン
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                アカウント情報を入力してください
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30"
                >
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </motion.div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide" htmlFor="username">
                  ユーザー名
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <User className="h-5 w-5" />
                  </div>
                  <Input
                    id="username"
                    type="text"
                    placeholder="ユーザー名を入力"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-14 text-base border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide" htmlFor="password">
                  パスワード
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock className="h-5 w-5" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="パスワードを入力"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-14 text-base border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                    aria-label="パスワード表示切り替え"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="relative w-full h-14 text-base font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 rounded-xl transition-all duration-300 overflow-hidden group"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      認証中...
                    </>
                  ) : (
                    <>
                      ログイン
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </Button>
            </form>

            {/* Trust Indicators */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>SSL暗号化</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>セキュア接続</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-slate-400 mt-8">
            © {new Date().getFullYear()} ユニバーサル企画株式会社
          </p>
        </motion.div>
      </div>
    </div>
  )
}
