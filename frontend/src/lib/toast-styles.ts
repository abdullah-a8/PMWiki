// Toast notification styles for consistent UI across the application

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastClassNames {
  toast: string
  title: string
  description: string
  icon: string
}

const variantColors = {
  success: 'green',
  error: 'red',
  info: 'blue',
  warning: 'yellow',
} as const

/**
 * Get consistent toast styles for different variants
 * @param variant - The toast variant (success, error, info, warning)
 * @returns ClassNames object for sonner toast
 */
export function getToastStyles(variant: ToastVariant): ToastClassNames {
  const color = variantColors[variant]

  return {
    toast: `bg-${color}-500/20 backdrop-blur-md border border-${color}-500/50 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-[356px] max-w-[356px]`,
    title: `text-${color}-100 font-semibold text-sm leading-tight`,
    description: `text-${color}-200/80 text-xs leading-tight mt-1`,
    icon: `text-${color}-400 flex-shrink-0 mt-0.5`,
  }
}
