/**
 * Content filter utility to detect and block contact information, payment discussions,
 * and off-platform communication attempts.
 *
 * Applied to all messages BEFORE a bid is accepted / payment confirmed.
 */

// ─── Email ───────────────────────────────────────────────────────────────────
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi

const OBFUSCATION_PATTERNS = [
  /[a-zA-Z0-9._%+-]+\s*\[\s*at\s*\]\s*[a-zA-Z0-9.-]+\s*\[\s*dot\s*\]\s*[a-zA-Z]{2,}/gi,
  /[a-zA-Z0-9._%+-]+\s*\(\s*at\s*\)\s*[a-zA-Z0-9.-]+\s*\(\s*dot\s*\)\s*[a-zA-Z]{2,}/gi,
  /[a-zA-Z0-9._%+-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,}/gi,
]

// ─── Phone ───────────────────────────────────────────────────────────────────
const PHONE_PATTERNS = [
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\b\d{2,4}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\(\d{2,4}\)\s*\d{3}[-.\s]?\d{4}/g,
  /\b0\d{2}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  /\+\d{1,4}\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/g,
]

// Digits separated by spaces/dots/dashes to dodge filters: "9 1 2 3 4 5 6 7 8"
const SPACED_DIGITS_PATTERN = /(?:\d\s*[-.\s]\s*){6,}\d/g

// ─── URLs / links ────────────────────────────────────────────────────────────
const URL_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /[a-zA-Z0-9-]+\.(com|net|org|io|co|me|info|app|dev|pt|uk|ie|de|fr|es|it|nl|be|eu|xyz|online|site|link|chat)\b/gi,
  // Obfuscated: "dot com", "dot co dot uk", etc.
  /[a-zA-Z0-9-]+\s+dot\s+(com|net|org|io|co|me|info|app|dev|pt|uk|ie)\b/gi,
]

// ─── Social handles ──────────────────────────────────────────────────────────
// @ followed by a username-like string (but not email – emails already caught)
const SOCIAL_HANDLE_PATTERN = /@[a-zA-Z_][a-zA-Z0-9_.]{1,30}\b/g

// ─── Messaging platforms (exact + fuzzy) ─────────────────────────────────────
const MESSAGING_APPS_EXACT = [
  'whatsapp', 'whats app', 'watsapp', 'wats app', 'w app', 'wapp',
  'whatapp', 'what app', 'whatsap', 'whats ap', 'watsap',
  'telegram', 'telagram', 'tele gram',
  'signal',
  'messenger', 'fb messenger', 'facebook messenger',
  'viber',
  'wechat', 'we chat',
  'imessage', 'i message', 'imsg',
  'snapchat', 'snap chat', 'snap',
  'discord',
  'skype',
  'facetime', 'face time',
  'line app',
  'sms me', 'dm me', 'pm me',
]

// Core words to check with fuzzy/spaced matching
const FUZZY_BLOCKED_WORDS = [
  'whatsapp',
  'telegram',
  'signal',
  'messenger',
  'snapchat',
  'discord',
  'viber',
  'wechat',
  'skype',
  'facetime',
]

// ─── Off-platform intent phrases ─────────────────────────────────────────────
const OFF_PLATFORM_PHRASES = [
  'text me', 'txt me', 'text you', 'txt you',
  'call me', 'call you', 'give me a call', 'give you a call',
  'message me', 'message you', 'msg me', 'msg you',
  'reach me at', 'reach me on', 'reach out on', 'reach out at',
  'contact me at', 'contact me on', 'contact you on',
  'hit me up on', 'hmu on', 'hmu at',
  'find me on', 'find me at', 'add me on',
  'my number is', 'my num is', 'my cell is',
  'here is my number', 'here\'s my number', 'heres my number',
  'send me your number', 'give me your number', 'share your number',
  'my insta', 'my ig', 'my snap', 'my tiktok',
  'my handle is', 'my username is',
  'outside the app', 'outside the platform', 'outside taskorilla',
  'off platform', 'off-platform', 'off the platform',
  'off the app', 'off app', 'offplatform',
  'talk off', 'speak off', 'chat off', 'move off',
  'talk outside', 'speak outside', 'chat outside', 'move outside',
  'connect on', 'connect via',
  'lets talk on', 'let\'s talk on', 'lets chat on', 'let\'s chat on',
  'talk on whats', 'chat on whats',
  'write me on', 'write to me on',
  'ring me', 'buzz me', 'ping me on',
]

// ─── Payment / currency (kept from original) ────────────────────────────────
const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', '₽', '₿', '฿', '₴', '₦', '₱', '₫', '₩', '₪', 'zł', 'kr', 'R$']

const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'NZD',
  'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'ZAR', 'RUB', 'KRW',
  'THB', 'PLN', 'TRY', 'AED', 'SAR', 'PHP', 'IDR', 'MYR', 'VND', 'CZK',
  'ILS', 'CLP', 'PEN', 'COP', 'ARS', 'EGP', 'PKR', 'BDT', 'NGN', 'UAH',
]

const PAYMENT_WORDS = [
  'payment', 'pay me', 'pay you', 'paying', 'paid',
  'dollar', 'dollars', 'euro', 'euros', 'pound', 'pounds', 'sterling',
  'money', 'cash', 'currency', 'transfer', 'wire', 'wiring',
  'venmo', 'paypal', 'zelle', 'cashapp', 'cash app', 'revolut', 'wise', 'transferwise',
  'bank account', 'bank details', 'account number', 'routing number', 'sort code',
  'iban', 'swift', 'bic',
  'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'ethereum', 'eth',
  'credit card', 'debit card', 'card number',
  'invoice', 'invoicing',
  'direct payment', 'pay directly', 'pay direct',
  'cent', 'cents', 'pence', 'quid', 'buck', 'bucks',
  'mbway', 'mb way', 'multibanco',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip spaces/dots/dashes/underscores between letters to catch
 * obfuscated words like "w h a t s a p p" or "w.h.a.t.s.a.p.p"
 */
function collapseSpaces(text: string): string {
  return text.replace(/([a-zA-Z])\s*[.\-_*|/\\]\s*(?=[a-zA-Z])/g, '$1')
             .replace(/([a-zA-Z])\s+(?=[a-zA-Z])/g, '$1')
}

/**
 * Normalise leet-speak and common substitutions
 */
function normaliseLeet(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a')
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => { p.lastIndex = 0; return p.test(text) })
}

function containsPhrase(normalised: string, phrases: string[]): string | null {
  for (const phrase of phrases) {
    if (phrase.includes(' ')) {
      if (normalised.includes(phrase)) return phrase
    } else {
      const rx = new RegExp(`\\b${phrase}s?\\b`, 'i')
      if (rx.test(normalised)) return phrase
    }
  }
  return null
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ContentCheckResult {
  isClean: boolean
  containsEmail: boolean
  containsPhone: boolean
  containsPaymentInfo: boolean
  containsUrl: boolean
  containsSocialHandle: boolean
  containsMessagingApp: boolean
  containsOffPlatformIntent: boolean
  detectedReason: string | null
  message: string
}

const CLEAN: ContentCheckResult = {
  isClean: true,
  containsEmail: false,
  containsPhone: false,
  containsPaymentInfo: false,
  containsUrl: false,
  containsSocialHandle: false,
  containsMessagingApp: false,
  containsOffPlatformIntent: false,
  detectedReason: null,
  message: '',
}

const BLOCK_MSG =
  'For your safety, sharing contact details, links, or references to other platforms is not allowed before payment is confirmed. All communication must stay on Taskorilla.'

function blocked(overrides: Partial<ContentCheckResult>, reason: string): ContentCheckResult {
  return { ...CLEAN, isClean: false, message: BLOCK_MSG, detectedReason: reason, ...overrides }
}

export function checkForContactInfo(content: string): ContentCheckResult {
  if (!content || typeof content !== 'string') return CLEAN

  const raw = content
  const lower = content.toLowerCase()

  // ── 1. Email ────────────────────────────────────────────────────────────
  if (raw.includes('@')) {
    return blocked({ containsEmail: true }, 'email/@ symbol')
  }
  if (matchesAny(raw, [EMAIL_PATTERN])) {
    return blocked({ containsEmail: true }, 'email pattern')
  }
  if (matchesAny(raw, OBFUSCATION_PATTERNS)) {
    return blocked({ containsEmail: true }, 'obfuscated email')
  }

  // ── 2. Phone ────────────────────────────────────────────────────────────
  const hasPhone = matchesAny(raw, PHONE_PATTERNS)
  const digitsOnly = raw.replace(/[^\d]/g, '')
  const suspiciousDigits = /\d{7,}|\d{3,4}[-.\s]\d{3,4}[-.\s]\d{3,4}/.test(raw)
  const hasSpacedDigits = SPACED_DIGITS_PATTERN.test(raw)
  if (hasPhone || (digitsOnly.length >= 7 && suspiciousDigits) || hasSpacedDigits) {
    return blocked({ containsPhone: true }, 'phone number')
  }

  // ── 3. URLs / links ────────────────────────────────────────────────────
  if (matchesAny(raw, URL_PATTERNS)) {
    return blocked({ containsUrl: true }, 'url/link')
  }

  // ── 4. Social handles (@username) ───────────────────────────────────────
  SOCIAL_HANDLE_PATTERN.lastIndex = 0
  if (SOCIAL_HANDLE_PATTERN.test(raw)) {
    return blocked({ containsSocialHandle: true }, 'social handle')
  }

  // ── 5. Messaging apps (exact match) ─────────────────────────────────────
  const exactApp = containsPhrase(lower, MESSAGING_APPS_EXACT)
  if (exactApp) {
    return blocked({ containsMessagingApp: true }, `messaging app: ${exactApp}`)
  }

  // ── 6. Messaging apps (fuzzy / spaced / leet) ──────────────────────────
  const collapsed = collapseSpaces(lower)
  const leetNorm = normaliseLeet(collapsed)
  for (const word of FUZZY_BLOCKED_WORDS) {
    if (leetNorm.includes(word) && !lower.includes(word)) {
      return blocked({ containsMessagingApp: true }, `obfuscated messaging app: ${word}`)
    }
  }

  // ── 7. Off-platform intent phrases ──────────────────────────────────────
  const intentPhrase = containsPhrase(lower, OFF_PLATFORM_PHRASES)
  if (intentPhrase) {
    return blocked({ containsOffPlatformIntent: true }, `off-platform intent: ${intentPhrase}`)
  }
  const collapsedIntent = containsPhrase(collapsed, OFF_PLATFORM_PHRASES)
  if (collapsedIntent) {
    return blocked({ containsOffPlatformIntent: true }, `obfuscated off-platform intent: ${collapsedIntent}`)
  }

  // ── 8. Payment / currency ──────────────────────────────────────────────
  const hasCurrencySymbol = CURRENCY_SYMBOLS.some(s => raw.includes(s))
  const hasCurrencyCode = CURRENCY_CODES.some(c => new RegExp(`\\b${c}\\b`, 'i').test(raw))
  const paymentWord = containsPhrase(lower, PAYMENT_WORDS)
  if (hasCurrencySymbol || hasCurrencyCode || paymentWord) {
    return blocked(
      { containsPaymentInfo: true },
      paymentWord ? `payment: ${paymentWord}` : 'currency reference',
    )
  }

  return CLEAN
}

// ─── Legacy helpers (kept for backward-compat) ───────────────────────────────

export function sanitizeContactInfo(content: string): string {
  if (!content || typeof content !== 'string') return content
  let s = content
  s = s.replace(EMAIL_PATTERN, '[removed]')
  OBFUSCATION_PATTERNS.forEach(p => { s = s.replace(p, '[removed]') })
  PHONE_PATTERNS.forEach(p => { s = s.replace(p, '[removed]') })
  URL_PATTERNS.forEach(p => { s = s.replace(p, '[removed]') })
  return s
}

export function validateMessageContent(content: string): void {
  const result = checkForContactInfo(content)
  if (!result.isClean) throw new Error(result.message)
}
