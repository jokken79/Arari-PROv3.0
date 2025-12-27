'use client'

import { motion } from 'framer-motion'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPercent } from '@/lib/utils'
import { Gauge, TrendingUp, TrendingDown, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MarginGaugeChartProps {
  currentMargin: number
  targetMargin?: number
  previousMargin?: number
}

export function MarginGaugeChart({
  currentMargin,
  targetMargin = 15,
  previousMargin
}: MarginGaugeChartProps) {
  // Clamp margin between 0 and 25 for display (target is 15%, max display 25%)
  const displayMargin = Math.min(Math.max(currentMargin, 0), 25)
  const marginPercent = (displayMargin / 25) * 100

  // Calculate gauge data
  const gaugeData = [
    { name: 'current', value: marginPercent, color: 'current' },
    { name: 'remaining', value: 100 - marginPercent, color: 'remaining' }
  ]

  // Determine color based on margin (製造派遣 target: 15%)
  const getMarginColor = (margin: number) => {
    if (margin >= 15) return '#f59e0b' // amber/gold - target achieved/excellent
    if (margin >= 12) return '#3b82f6' // blue - close to target
    if (margin >= 10) return '#22c55e' // green - improvement needed
    if (margin >= 7) return '#f97316' // orange - warning
    return '#ef4444' // red - critical (<7%)
  }

  const marginColor = getMarginColor(currentMargin)
  const isAboveTarget = currentMargin >= targetMargin
  const marginChange = previousMargin !== undefined ? currentMargin - previousMargin : null

  // Background segments for better gauge visualization
  // Scale is 0-25%, distribution based on 製造派遣 ranges:
  // 0-7%: 7 points / 25 = 28% (critical - red)
  // 7-10%: 3 points / 25 = 12% (warning - orange)
  // 10-12%: 2 points / 25 = 8% (green)
  // 12-15%: 3 points / 25 = 12% (blue)
  // 15-25%: 10 points / 25 = 40% (gold/amber)
  const backgroundSegments = [
    { name: 'critical', value: 28, color: 'rgba(239, 68, 68, 0.1)' },     // 0-7% red
    { name: 'warning', value: 12, color: 'rgba(249, 115, 22, 0.1)' },     // 7-10% orange
    { name: 'green', value: 8, color: 'rgba(34, 197, 94, 0.1)' },         // 10-12% green
    { name: 'blue', value: 12, color: 'rgba(59, 130, 246, 0.1)' },        // 12-15% blue
    { name: 'gold', value: 40, color: 'rgba(245, 158, 11, 0.1)' },        // 15-25% gold/amber
  ]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            マージン率ゲージ
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            目標: {formatPercent(targetMargin)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="relative h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* Background arc segments */}
                <Pie
                  data={backgroundSegments}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  {backgroundSegments.map((entry, index) => (
                    <Cell key={`bg-${index}`} fill={entry.color} />
                  ))}
                </Pie>

                {/* Main gauge arc */}
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="65%"
                  outerRadius="85%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}
                  animationBegin={300}
                >
                  <Cell fill={marginColor} />
                  <Cell fill="transparent" />
                </Pie>

                {/* Target indicator */}
                <Pie
                  data={[
                    { value: (targetMargin / 25) * 100 - 1 },
                    { value: 2 },
                    { value: 100 - (targetMargin / 25) * 100 - 1 }
                  ]}
                  cx="50%"
                  cy="70%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius="55%"
                  outerRadius="95%"
                  paddingAngle={0}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="transparent" />
                  <Cell fill="rgba(99, 102, 241, 0.8)" />
                  <Cell fill="transparent" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '20%' }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="text-center"
              >
                <p
                  className="text-4xl font-bold"
                  style={{ color: marginColor }}
                >
                  {formatPercent(currentMargin)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  現在のマージン率
                </p>

                {marginChange !== null && (
                  <div className={cn(
                    "flex items-center justify-center gap-1 mt-2 text-sm font-medium",
                    marginChange >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {marginChange >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    <span>
                      {marginChange >= 0 ? '+' : ''}{marginChange.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground">前月比</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* Legend - 製造派遣 ranges (target 15%) */}
          <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">7-10%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">10-12%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">12-15%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">&gt;15%</span>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex justify-center mt-4">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
              isAboveTarget
                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                : "bg-orange-500/10 text-orange-500 border border-orange-500/20"
            )}>
              <Target className="h-4 w-4" />
              {isAboveTarget ? '目標達成' : '目標未達'}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
