'use client'

import { motion } from 'framer-motion'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

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
    default: 'bg-card',
    success: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20',
    warning: 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
    danger: 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border-red-500/20',
    gradient: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white border-0',
  }

  const iconStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-emerald-500/10 text-emerald-500',
    warning: 'bg-amber-500/10 text-amber-500',
    danger: 'bg-red-500/10 text-red-500',
    gradient: 'bg-white/20 text-white',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, type: 'spring' }}
    >
      <Card
        className={cn(
          'relative overflow-hidden p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
          variantStyles[variant]
        )}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10">
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
              className="text-3xl font-bold tracking-tight"
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
                    <TrendIcon className="w-4 h-4 mr-1" />
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
      </Card>
    </motion.div>
  )
}
