'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="glass-card p-8 rounded-xl border border-border">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            エラーが発生しました
          </h1>

          <p className="text-muted-foreground mb-6">
            予期しないエラーが発生しました。もう一度お試しください。
          </p>

          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => reset()}
              variant="default"
              className="gap-2"
              aria-label="もう一度試す"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              もう一度試す
            </Button>

            <Button
              asChild
              variant="outline"
              className="gap-2"
            >
              <Link href="/" aria-label="ダッシュボードに戻る">
                <Home className="h-4 w-4" aria-hidden="true" />
                ダッシュボード
              </Link>
            </Button>
          </div>
        </div>

        {error.digest && (
          <p className="mt-4 text-xs text-muted-foreground">
            エラーID: {error.digest}
          </p>
        )}
      </motion.div>
    </div>
  )
}
