'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Building2, X, Command } from 'lucide-react'
import { useEmployees } from '@/hooks/useEmployees'

interface SearchResult {
  id: string
  type: 'employee' | 'company'
  title: string
  subtitle: string
  url: string
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const { data: employees = [] } = useEmployees()

  // Filter results based on query
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return []

    const searchLower = query.toLowerCase()
    const matchedEmployees: SearchResult[] = []
    const matchedCompanies = new Set<string>()

    employees.forEach(emp => {
      // Match employees
      if (
        emp.employee_id.toLowerCase().includes(searchLower) ||
        emp.name.toLowerCase().includes(searchLower) ||
        (emp.name_kana && emp.name_kana.toLowerCase().includes(searchLower))
      ) {
        matchedEmployees.push({
          id: emp.employee_id,
          type: 'employee',
          title: emp.name_kana || emp.name,
          subtitle: `${emp.employee_id} - ${emp.dispatch_company}`,
          url: `/employees/${emp.employee_id}`,
        })
      }

      // Collect matching companies
      if (emp.dispatch_company.toLowerCase().includes(searchLower)) {
        matchedCompanies.add(emp.dispatch_company)
      }
    })

    // Add company results
    const companyResults: SearchResult[] = Array.from(matchedCompanies).map(company => ({
      id: `company-${company}`,
      type: 'company',
      title: company,
      subtitle: `派遣先企業`,
      url: `/employees?company=${encodeURIComponent(company)}`,
    }))

    // Combine and limit results
    return [...matchedEmployees.slice(0, 8), ...companyResults.slice(0, 4)]
  }, [query, employees])

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }

      // Close on Escape
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Navigation within results
  const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      router.push(results[selectedIndex].url)
      setIsOpen(false)
      setQuery('')
    }
  }, [results, selectedIndex, router])

  const handleSelect = (result: SearchResult) => {
    router.push(result.url)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg border border-transparent hover:border-border transition-all group"
        aria-label="検索 (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">検索...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-background/50 rounded border border-border/50">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Search modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyNavigation}
                  placeholder="従業員名、社員番号、派遣先で検索..."
                  className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-[400px] overflow-auto">
                {query.trim() === '' ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">従業員名、社員番号、または派遣先企業名を入力</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <p className="text-sm">「{query}」に一致する結果はありません</p>
                  </div>
                ) : (
                  <div className="py-2">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? 'bg-cyan-500/20 text-foreground'
                            : 'text-muted-foreground hover:bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          result.type === 'employee'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {result.type === 'employee' ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            <Building2 className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {index === selectedIndex && (
                          <kbd className="px-2 py-1 text-[10px] font-mono bg-white/10 rounded">
                            Enter
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">↑↓</kbd>
                  移動
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd>
                  選択
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded">Esc</kbd>
                  閉じる
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
