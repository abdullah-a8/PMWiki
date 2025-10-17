// Toast notification styles for consistent UI across the application

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface ToastClassNames {
  toast: string
  title: string
  description: string
  icon: string
}

/**
 * Get consistent toast styles for different variants
 * Using explicit classes instead of template literals for Tailwind production builds
 * @param variant - The toast variant (success, error, info, warning)
 * @returns ClassNames object for sonner toast
 */
export function getToastStyles(variant: ToastVariant): ToastClassNames {
  const variants = {
    success: {
      toast: 'bg-green-500/20 backdrop-blur-md border border-green-500/50 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-[356px] max-w-[356px]',
      title: 'text-green-100 font-semibold text-sm leading-tight',
      description: 'text-green-200/80 text-xs leading-tight mt-1',
      icon: 'text-green-400 flex-shrink-0 mt-0.5',
    },
    error: {
      toast: 'bg-red-500/20 backdrop-blur-md border border-red-500/50 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-[356px] max-w-[356px]',
      title: 'text-red-100 font-semibold text-sm leading-tight',
      description: 'text-red-200/80 text-xs leading-tight mt-1',
      icon: 'text-red-400 flex-shrink-0 mt-0.5',
    },
    info: {
      toast: 'bg-blue-500/20 backdrop-blur-md border border-blue-500/50 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-[356px] max-w-[356px]',
      title: 'text-blue-100 font-semibold text-sm leading-tight',
      description: 'text-blue-200/80 text-xs leading-tight mt-1',
      icon: 'text-blue-400 flex-shrink-0 mt-0.5',
    },
    warning: {
      toast: 'bg-yellow-500/20 backdrop-blur-md border border-yellow-500/50 shadow-lg rounded-lg p-4 flex items-start gap-3 min-w-[356px] max-w-[356px]',
      title: 'text-yellow-100 font-semibold text-sm leading-tight',
      description: 'text-yellow-200/80 text-xs leading-tight mt-1',
      icon: 'text-yellow-400 flex-shrink-0 mt-0.5',
    },
  }

  return variants[variant]
}
