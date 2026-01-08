'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient'
  delay?: number
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  delay = 0,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return TrendingUp
    if (trend.value < 0) return TrendingDown
    return Minus
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-emerald-500'
    if (trend.value < 0) return 'text-red-500'
    return 'text-muted-foreground'
  }

  const TrendIcon = getTrendIcon()

  const variantStyles = {
    default: 'glass-card',
    success: 'bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 backdrop-blur-md',
    warning: 'bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 backdrop-blur-md',
    danger: 'bg-red-500/10 border border-red-500/20 hover:border-red-500/40 backdrop-blur-md',
    gradient: 'bg-gradient-to-br from-primary via-blue-600 to-indigo-600 text-white border-0 shadow-[0_0_20px_hsl(var(--primary)/0.3)]',
  }

  const iconStyles = {
    default: 'bg-cyan-500/10 text-cyan-400',
    success: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    danger: 'bg-red-500/10 text-red-400',
    gradient: 'bg-white/20 text-white',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, type: 'spring' }}
    >
      <GlassCard
        variant={variant === 'gradient' ? 'neo' : 'default'}
        className={cn(
          'relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
          variantStyles[variant]
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10" aria-hidden="true">
          <Icon className="w-full h-full" />
        </div>

        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn(
              'text-sm font-medium',
              variant === 'gradient' ? 'text-white/80' : 'text-muted-foreground'
            )}>
              {title}
            </p>
            <motion.p
              className="text-2xl md:text-3xl font-bold tracking-tight"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay * 0.1 + 0.2, type: 'spring' }}
            >
              {value}
            </motion.p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2">
                {trend && TrendIcon && (
                  <span className={cn('flex items-center text-sm font-medium', getTrendColor())}>
                    <TrendIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                    {trend.value > 0 ? '+' : ''}{trend.value}%
                  </span>
                )}
                {subtitle && (
                  <span className={cn(
                    'text-sm',
                    variant === 'gradient' ? 'text-white/70' : 'text-muted-foreground'
                  )}>
                    {subtitle}
                  </span>
                )}
              </div>
            )}
          </div>

          <motion.div
            className={cn('rounded-xl p-3', iconStyles[variant])}
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400 }}
            aria-hidden="true"
          >
            <Icon className="w-6 h-6" />
          </motion.div>
        </div>

        {/* Animated bottom bar */}
        {variant === 'gradient' && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-white/30"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: delay * 0.1 + 0.3, duration: 1 }}
          />
        )}
      </GlassCard>
    </motion.div>
  )
}
