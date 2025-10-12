import { Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookmarkIconProps {
  isBookmarked: boolean
  className?: string
  size?: number
}

export function BookmarkIcon({
  isBookmarked,
  className,
  size = 16
}: BookmarkIconProps) {
  const Icon = isBookmarked ? BookmarkCheck : Bookmark

  return (
    <Icon
      className={cn(
        "transition-all duration-200",
        isBookmarked
          ? "text-primary fill-primary scale-110"
          : "text-muted-foreground",
        className
      )}
      size={size}
    />
  )
}
