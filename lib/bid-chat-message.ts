import { formatEuro } from '@/lib/currency'

/** Stable prefix for chat rows inserted when a helper adjusts their bid (matches user-facing copy). */
export const BID_UPDATE_CHAT_PREFIX = 'Helper has updated their bid to '

export const BID_UPDATE_CHAT_PREFIX_PT = 'O ajudante atualizou a proposta para '

export const BID_WITHDRAWN_CHAT_PREFIX = 'Helper has withdrawn their bid'

export const BID_WITHDRAWN_CHAT_PREFIX_PT = 'O ajudante retirou a proposta'

export type BidChatLocale = 'en' | 'pt'

export function buildBidUpdateChatMessage(amount: number, locale: BidChatLocale = 'en'): string {
  const prefix = locale === 'pt' ? BID_UPDATE_CHAT_PREFIX_PT : BID_UPDATE_CHAT_PREFIX
  return `${prefix}${formatEuro(amount, true)}.`
}

export function buildBidWithdrawnChatMessage(amount: number, locale: BidChatLocale = 'en'): string {
  const prefix = locale === 'pt' ? BID_WITHDRAWN_CHAT_PREFIX_PT : BID_WITHDRAWN_CHAT_PREFIX
  return `${prefix} (${formatEuro(amount, true)}).`
}

export function isBidUpdateSystemMessage(content: string): boolean {
  return (
    typeof content === 'string' &&
    (content.startsWith(BID_UPDATE_CHAT_PREFIX) || content.startsWith(BID_UPDATE_CHAT_PREFIX_PT))
  )
}

export function isBidWithdrawnSystemMessage(content: string): boolean {
  return (
    typeof content === 'string' &&
    (content.startsWith(BID_WITHDRAWN_CHAT_PREFIX) || content.startsWith(BID_WITHDRAWN_CHAT_PREFIX_PT))
  )
}
