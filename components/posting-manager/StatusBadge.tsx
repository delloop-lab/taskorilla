import type { PostingStatus } from '@/lib/postingManagerTypes'
import { getStatusColor } from '@/lib/postingManagerHelpers'

interface Props {
  status: PostingStatus
  label?: string
  variant?: 'default' | 'pending'
}

export default function StatusBadge({ status, label, variant = 'default' }: Props) {
  const isPendingVariant = variant === 'pending'
  const color = isPendingVariant ? 'amber' : getStatusColor(status)
  const text =
    label ||
    (status === 'ready' ? 'Ready to post' : status === 'waiting' ? 'Waiting' : 'Never posted')

  const base =
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border'

  const classes =
    color === 'green'
      ? 'bg-green-50 text-green-800 border-green-200'
      : color === 'red'
      ? 'bg-red-50 text-red-800 border-red-200'
      : 'bg-amber-50 text-amber-800 border-amber-200'

  return <span className={`${base} ${classes}`}>{text}</span>
}

