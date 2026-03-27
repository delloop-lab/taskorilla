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
  // Portuguese equivalents
  'manda mensagem', 'manda-me mensagem', 'envia mensagem',
  'liga me', 'liga-me', 'liga para mim', 'liga para me',
  'fala comigo', 'fala comigo no', 'fala comigo em',
  'contacta me', 'contacta-me', 'entra em contacto',
  'entra em contato', 'fale comigo', 'fala no',
  'encontra me', 'encontra-me', 'procura me', 'procura-me',
  'adiciona me', 'adiciona-me', 'segue me', 'segue-me',
  'o meu numero', 'meu numero', 'o meu telemovel', 'meu telemovel',
  'o meu contacto', 'meu contacto', 'meu contato',
  'fora da app', 'fora do app', 'fora da plataforma', 'fora da taskorilla',
  'offplatforma', 'off plataforma',
  'vamos falar no', 'vamos falar em', 'vamos conversar no', 'vamos conversar em',
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
  // Portuguese equivalents
  'pagamento', 'pagar', 'paga me', 'paga-me', 'paga te', 'paga-te',
  'dinheiro', 'numerario', 'numerário',
  'transferencia', 'transferência', 'transferir',
  'conta bancaria', 'conta bancária', 'dados bancarios', 'dados bancários',
  'nib', 'iban', 'swift',
  'cartao', 'cartão', 'cartao de credito', 'cartão de crédito', 'cartao de debito', 'cartão de débito',
  'fatura', 'factura', 'faturacao', 'faturação',
  'pagar por fora', 'pagamento por fora', 'pagamento direto', 'pagamento directo',
  'euro', 'euros', 'centimo', 'cêntimo', 'centimos', 'cêntimos',
]

// ─── Addresses / location sharing ────────────────────────────────────────────
const ADDRESS_PATTERNS = [
  // Portuguese street formats: "Rua X", "Avenida Y", "Travessa Z", etc.
  /\b(rua|r\.|avenida|av\.|travessa|tv\.|largo|praça|praca|estrada|estr\.|urbanizacao|urbanização|quint[aao]|beco|alameda|rotunda)\s+[a-zA-ZÀ-ÿ0-9'.,\-\s]{2,60}\b/gi,
  // e.g. "123 Main Street", "45B King Rd", "12-14 High Avenue"
  /\b\d{1,5}[a-zA-Z]?\s*(?:[-/]\s*\d{1,5}[a-zA-Z]?)?\s+[a-zA-Z0-9'.,\-\s]{2,40}\b(street|st|road|rd|avenue|ave|lane|ln|drive|dr|court|ct|crescent|close|way|place|pl|boulevard|blvd|terrace|ter|square|sq|parkway|pkwy)\b/gi,
  // Apartment / unit style
  /\b(?:apt|apartment|unit|suite|flat)\s*#?\s*[a-zA-Z0-9\-]{1,10}\b/gi,
  // Portuguese apartment/floor notation
  /\b(?:andar|dto|esq|frac[cç][aã]o|fra[cç][aã]o|lote|bloco)\s*[a-zA-Z0-9\-]{0,12}\b/gi,
  // Eircode-like (Ireland): A65 F4E2
  /\b[a-zA-Z]\d{2}\s?[a-zA-Z0-9]{4}\b/g,
  // UK postcode style: SW1A 1AA
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
  // Portuguese postal code: 1234-567
  /\b\d{4}-\d{3}\b/g,
]

const ADDRESS_INTENT_PHRASES = [
  'my address is',
  'address is',
  'come to my house',
  'come to my home',
  'meet me at',
  'pick me up at',
  'drop it at',
  'send it to',
  'post it to',
  'deliver to my address',
  'morada',
  'a minha morada',
  'minha morada',
  'endereço',
  'meu endereço',
  'a minha casa',
  'vem ter comigo',
  'encontra-me em',
  'encontramo-nos em',
  'passa em',
  'entrego em',
  'leva a',
  'rua',
  'avenida',
  'travessa',
  'estrada',
]

const OFF_PLATFORM_ESCALATION_PHRASES = [
  'i will see you',
  'see you there',
  'see you soon',
  'look me up',
  'look us up',
  'check facebook',
  'check my facebook',
  'check instagram',
  'check my instagram',
  'check whatsapp',
  'find me on facebook',
  'find me on instagram',
  'find me on whatsapp',
  'procura-me',
  've no facebook',
  'vê no facebook',
  'vê no insta',
  've no insta',
  'fala comigo no',
  'manda mensagem no',
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
  containsAddress: boolean
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
  containsAddress: false,
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
  const escalationIntent = containsPhrase(lower, OFF_PLATFORM_ESCALATION_PHRASES)
  if (escalationIntent) {
    return blocked({ containsOffPlatformIntent: true }, `off-platform escalation: ${escalationIntent}`)
  }
  const collapsedEscalationIntent = containsPhrase(collapsed, OFF_PLATFORM_ESCALATION_PHRASES)
  if (collapsedEscalationIntent) {
    return blocked({ containsOffPlatformIntent: true }, `obfuscated off-platform escalation: ${collapsedEscalationIntent}`)
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

  // ── 9. Address sharing ─────────────────────────────────────────────────
  if (matchesAny(raw, ADDRESS_PATTERNS)) {
    return blocked({ containsAddress: true }, 'address pattern')
  }
  const addressIntent = containsPhrase(lower, ADDRESS_INTENT_PHRASES)
  if (addressIntent) {
    return blocked({ containsAddress: true }, `address intent: ${addressIntent}`)
  }
  const collapsedAddressIntent = containsPhrase(collapsed, ADDRESS_INTENT_PHRASES)
  if (collapsedAddressIntent) {
    return blocked({ containsAddress: true }, `obfuscated address intent: ${collapsedAddressIntent}`)
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
