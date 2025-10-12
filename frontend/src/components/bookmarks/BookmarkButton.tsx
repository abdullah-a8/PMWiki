import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BookmarkIcon } from "./BookmarkIcon"
import { useUserDataStore, MAX_BOOKMARKS } from "@/stores/useUserDataStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getToastStyles } from "@/lib/toast-styles"
import { useShallow } from "zustand/react/shallow"

interface BookmarkButtonProps {
  section: {
    id: string
    standard: string
    section_number: string
    section_title: string
    page_start?: number
    page_end?: number
    content: string
    citation: string
    relevance_score?: number
  }
  from: 'search' | 'comparison' | 'library' | 'section-detail'
  variant?: 'default' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  showTooltip?: boolean
  className?: string
}

export function BookmarkButton({
  section,
  from,
  variant = 'ghost',
  size = 'icon',
  showTooltip = true,
  className,
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, bookmarkCount } = useUserDataStore(
    useShallow((state) => ({
      isBookmarked: state.isBookmarked(section.id),
      toggleBookmark: state.toggleBookmark,
      bookmarkCount: state.getBookmarkCount(),
    }))
  )
  const [isAnimating, setIsAnimating] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check limit before adding
    if (!isBookmarked && bookmarkCount >= MAX_BOOKMARKS) {
      toast.error('Bookmark limit reached', {
        description: `You can bookmark up to ${MAX_BOOKMARKS} sections`,
        unstyled: true,
        classNames: getToastStyles('error'),
      })
      return
    }

    const newState = toggleBookmark({
      id: section.id,
      type: 'section',
      standard: section.standard,
      section_number: section.section_number,
      section_title: section.section_title,
      page_start: section.page_start,
      page_end: section.page_end,
      content_preview: section.content.substring(0, 200),
      citation: section.citation,
      bookmarked_from: from,
      relevance_score: section.relevance_score,
    })

    // Trigger animation
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)

    // Show toast notification
    if (newState) {
      toast.success('Bookmarked', {
        description: section.section_title,
        unstyled: true,
        classNames: getToastStyles('success'),
      })
    } else {
      toast.error('Removed from bookmarks', {
        description: section.section_title,
        unstyled: true,
        classNames: getToastStyles('error'),
      })
    }
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        "transition-transform duration-200",
        isAnimating && "scale-125",
        "hover:scale-110",
        className
      )}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <BookmarkIcon isBookmarked={isBookmarked} />
    </Button>
  )

  if (!showTooltip) {
    return button
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent>
          <p>{isBookmarked ? "Remove bookmark" : "Bookmark this section"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
