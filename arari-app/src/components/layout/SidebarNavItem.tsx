'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { NavItem } from './navigation-config'

interface SidebarNavItemProps {
  item: NavItem
  collapsed: boolean
  index?: number
  variant?: 'main' | 'admin'
  onMobileClick?: () => void
}

export function SidebarNavItem({
  item,
  collapsed,
  index = 0,
  variant = 'main',
  onMobileClick,
}: SidebarNavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === item.href
  const Icon = item.icon
  const isMainNav = variant === 'main'

  const linkContent = (
    <Link
      href={item.href}
      onClick={onMobileClick}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
        isMainNav && 'duration-300',
        !isMainNav && 'duration-200',
        isActive && isMainNav
          ? 'bg-neon-blue/10 text-neon-blue border border-neon-blue/20 shadow-[0_0_15px_rgba(0,242,234,0.1)]'
          : isActive && !isMainNav
          ? 'bg-muted text-foreground'
          : isMainNav
          ? 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground dark:hover:text-white group'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0',
          isMainNav && 'transition-transform duration-300',
          !isActive && isMainNav && 'group-hover:scale-110 group-hover:text-primary',
        )}
      />
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex flex-col overflow-hidden"
          >
            <span className="whitespace-nowrap">{item.name}</span>
            {!isActive && item.description && isMainNav && (
              <span className="text-xs text-muted-foreground whitespace-nowrap group-hover:text-muted-foreground/80 transition-colors">
                {item.description}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {isActive && !collapsed && isMainNav && (
        <motion.div
          layoutId="activeIndicator"
          className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-blue shadow-[0_0_10px_#00f2ea]"
        />
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">
          <div>
            <p className="font-medium">{item.name}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}

interface AnimatedNavItemProps extends SidebarNavItemProps {
  index: number
}

export function AnimatedNavItem(props: AnimatedNavItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: props.index * 0.05 }}
    >
      <SidebarNavItem {...props} />
    </motion.div>
  )
}
