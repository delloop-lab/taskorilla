'use client'

interface RatingProps {
  rating: number | null
  reviewCount: number
  showCount?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * Reusable Rating component that displays stars and review count
 */
export default function Rating({
  rating,
  reviewCount,
  showCount = true,
  size = 'md',
  className = ''
}: RatingProps) {
  if (rating === null || rating === undefined || reviewCount === 0) {
    const emptyStarSizeClass = size === 'sm' 
      ? 'text-xs sm:text-sm' 
      : size === 'lg' 
      ? 'text-base sm:text-lg' 
      : 'text-sm sm:text-base'
    const emptyTextSizeClass = size === 'sm' 
      ? 'text-xs sm:text-sm' 
      : 'text-sm sm:text-base'
    
    return (
      <div className={`flex items-center gap-1 sm:gap-1.5 flex-wrap ${className}`}>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={`empty-${i}`}
              className={`text-gray-300 ${emptyStarSizeClass}`}
            >
              ★
            </span>
          ))}
        </div>
        {showCount && (
          <span className={`text-gray-500 ${emptyTextSizeClass}`}>
            No reviews
          </span>
        )}
      </div>
    )
  }

  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  // Responsive sizing: smaller on mobile, larger on desktop
  const starSizeClass = size === 'sm' 
    ? 'text-xs sm:text-sm' 
    : size === 'lg' 
    ? 'text-base sm:text-lg' 
    : 'text-sm sm:text-base'
  const textSizeClass = size === 'sm' 
    ? 'text-xs sm:text-sm' 
    : 'text-sm sm:text-base'

  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 flex-wrap ${className}`}>
      <div className="flex items-center gap-0.5">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <span key={`full-${i}`} className={`text-amber-500 ${starSizeClass}`}>
            ★
          </span>
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <span className={`text-amber-500 ${starSizeClass}`} style={{ opacity: 0.5 }}>
            ★
          </span>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <span key={`empty-${i}`} className={`text-gray-300 ${starSizeClass}`}>
            ★
          </span>
        ))}
      </div>
      <span className={`text-amber-600 font-semibold ${textSizeClass}`}>
        {rating.toFixed(1)}
      </span>
      {showCount && reviewCount > 0 && (
        <span className={`text-gray-600 ${textSizeClass} whitespace-nowrap`}>
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  )
}














