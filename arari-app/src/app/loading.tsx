'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="データを読み込み中"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="glass-card p-8 rounded-xl border border-border">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="flex justify-center mb-4"
          >
            <Loader2 className="h-12 w-12 text-primary" aria-hidden="true" />
          </motion.div>

          <h2 className="text-lg font-medium text-foreground mb-2">
            読み込み中...
          </h2>

          <p className="text-sm text-muted-foreground">
            データを読み込んでいます
          </p>

          {/* Loading skeleton preview */}
          <div className="mt-6 space-y-3">
            <div className="h-4 bg-muted/50 rounded animate-pulse" />
            <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4 mx-auto" />
            <div className="h-4 bg-muted/50 rounded animate-pulse w-1/2 mx-auto" />
          </div>
        </div>
      </motion.div>
    </div>
  )
}
