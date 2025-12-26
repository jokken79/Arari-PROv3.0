import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook to trap focus within a container element.
 * Used for modals and dialogs to ensure keyboard accessibility.
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => el.offsetParent !== null) // Filter out hidden elements
  }, [])

  useEffect(() => {
    if (!isOpen) {
      // Restore focus to previous element when closing
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus()
      }
      return
    }

    // Save the currently focused element
    previousActiveElement.current = document.activeElement

    const container = containerRef.current
    if (!container) return

    // Focus the first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => {
        focusableElements[0]?.focus()
      }, 50)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, getFocusableElements])

  return containerRef
}

export default useFocusTrap
