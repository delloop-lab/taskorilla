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

// Allowed map links (pins/routes) that should not be treated as off-platform links.
const GOOGLE_MAPS_ALLOWLIST_PATTERN =
  /https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)[^\s]*/gi

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

// Payment instructions that should remain blocked even when price/currency
// discussion is allowed in pre-payment chat.
const DIRECT_PAYMENT_WORDS = [
  'pay me', 'pay you', 'direct payment', 'pay directly', 'pay direct',
  'transfer', 'wire', 'wiring', 'bank account', 'bank details',
  'account number', 'routing number', 'sort code', 'iban', 'swift', 'bic',
  'venmo', 'paypal', 'zelle', 'cashapp', 'cash app', 'revolut', 'wise',
  'transferwise', 'credit card', 'debit card', 'card number',
  'bitcoin', 'btc', 'crypto', 'cryptocurrency', 'ethereum', 'eth',
  'mbway', 'mb way', 'multibanco', 'cash', 'numerario', 'numerário',
  'paga me', 'paga-me', 'pagar por fora', 'pagamento por fora',
  'pagamento direto', 'pagamento directo', 'conta bancaria', 'conta bancária',
  'dados bancarios', 'dados bancários', 'nib',
]

// ─── Addresses / location sharing ────────────────────────────────────────────
// Strong block: explicit house-number + street-shape patterns.
const ADDRESS_NUMBER_STRONG_PATTERNS = [
  // [number] [street-name] [street-keyword]
  /\b\d{1,5}[a-zA-Z]?\s+(?:[a-zA-ZÀ-ÿ0-9'’.\-]+\s+){0,4}(?:st(?:\.|reet)?|street|rd(?:\.|oad)?|ave(?:\.|nue)?|av\.?|blvd(?:\.|boulevard)?|dr(?:\.|ive)?|ln(?:\.|lane)?|ct(?:\.|court)?|pl(?:\.|place)?|rua|r\.?|avenida|travessa|tv\.?|largo|lg\.?|estrada|estr\.?|alameda|beco|praça|praca)\b(?:,?\s+[a-zA-ZÀ-ÿ'’.\-]+(?:\s+[a-zA-ZÀ-ÿ'’.\-]+){0,3})?(?:,?\s*(?:\d{4}-\d{3}|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|[A-Z]\d{2}\s?[A-Z0-9]{4}))?/gi,
  // [street-keyword] [street-name] [number]
  /\b(?:st(?:\.|reet)?|street|rd(?:\.|oad)?|ave(?:\.|nue)?|av\.?|blvd(?:\.|boulevard)?|dr(?:\.|ive)?|ln(?:\.|lane)?|ct(?:\.|court)?|pl(?:\.|place)?|rua|r\.?|avenida|travessa|tv\.?|largo|lg\.?|estrada|estr\.?|alameda|beco|praça|praca)\s+(?:[a-zA-ZÀ-ÿ0-9'’.\-]+\s+){0,4}\d{1,5}[a-zA-Z]?\b(?:,?\s+[a-zA-ZÀ-ÿ'’.\-]+(?:\s+[a-zA-ZÀ-ÿ'’.\-]+){0,3})?(?:,?\s*(?:\d{4}-\d{3}|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|[A-Z]\d{2}\s?[A-Z0-9]{4}))?/gi,
]

// Intent-triggered block for numberless street names.
const ADDRESS_INTENT_STREET_PATTERNS = [
  /\b(?:my address is|address is|i live at|i live in|meet me at|come to my house|come to my home|pick me up at|drop it at|send it to|post it to|deliver to my address|morada|a minha morada|minha morada|endereço|meu endereço|moro em|moro na|vivo em|vivo na|a minha casa|vem ter comigo|encontra-me em|encontramo-nos em|passa em|entrego em|leva a)\b[\s,:-]*(?:na\s+|no\s+|em\s+|at\s+|in\s+)?(?:st(?:\.|reet)?|street|rd(?:\.|oad)?|ave(?:\.|nue)?|av\.?|blvd(?:\.|boulevard)?|dr(?:\.|ive)?|ln(?:\.|lane)?|ct(?:\.|court)?|pl(?:\.|place)?|rua|r\.?|avenida|travessa|tv\.?|largo|lg\.?|estrada|estr\.?|alameda|beco|praça|praca)\s+(?:[a-zA-ZÀ-ÿ0-9'’.\-]+\s*){1,6}\b/gi,
]

// Eircode-like (Ireland), UK postcode and PT postcode
const ADDRESS_POSTCODE_PATTERNS = [
  /\b[a-zA-Z]\d{2}\s?[a-zA-Z0-9]{4}\b/g,
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi,
  /\b\d{4}-\d{3}\b/g,
]

const ADDRESS_INTENT_PHRASES = [
  'my address is',
  'address is',
  'i live at',
  'i live in',
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
  'moro em',
  'moro na',
  'vivo em',
  'vivo na',
  'vem ter comigo',
  'encontra-me em',
  'encontramo-nos em',
  'passa em',
  'entrego em',
  'leva a',
]

// Area/measurement language that should not be treated as an address.
const AREA_MEASUREMENT_PATTERN = /\b\d{1,4}(?:[.,]\d{1,2})?\s*(?:m2|m²|sqm|sq\.?\s*m|m\s*sq|mt\s*sq|mts?|mtrs?)\b/i
const ADDRESS_KEYWORD_PATTERN = /\b(rua|avenida|travessa|largo|praça|praca|estrada|alameda|street|road|avenue|lane|drive|court|postcode|postal|morada|address)\b/i

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

const SAINT_STYLE_NAME_PATTERN = /\bst\.?\s+[a-zA-ZÀ-ÿ]+(?:\s+[a-zA-ZÀ-ÿ]+){0,2}\b/i

function hasStrongAddressNumber(content: string): boolean {
  return matchesAny(content, ADDRESS_NUMBER_STRONG_PATTERNS)
}

function hasIntentTriggeredStreet(content: string): boolean {
  return matchesAny(content, ADDRESS_INTENT_STREET_PATTERNS)
}

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

function stripAllowedMapUrls(text: string): string {
  if (!text) return text
  return text.replace(GOOGLE_MAPS_ALLOWLIST_PATTERN, ' ')
}

export function extractAllowedGoogleMapsUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null
  GOOGLE_MAPS_ALLOWLIST_PATTERN.lastIndex = 0
  const match = GOOGLE_MAPS_ALLOWLIST_PATTERN.exec(text)
  return match?.[0] || null
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

export interface ContentFilterOptions {
  allowPaymentTerms?: boolean
}

export interface ContentIssueFlags {
  containsEmail: boolean
  containsPhone: boolean
  containsPaymentInfo: boolean
  containsAddress: boolean
  containsUrl: boolean
  containsSocialHandle: boolean
  containsMessagingApp: boolean
  containsOffPlatformIntent: boolean
  hasForbiddenContent: boolean
}

export function hasSpacedDigitsPattern(content: string): boolean {
  if (!content || typeof content !== 'string') return false
  SPACED_DIGITS_PATTERN.lastIndex = 0
  return SPACED_DIGITS_PATTERN.test(content)
}

export function detectContentIssues(
  content: string,
  options: ContentFilterOptions = {}
): ContentIssueFlags {
  if (!content || typeof content !== 'string') {
    return {
      containsEmail: false,
      containsPhone: false,
      containsPaymentInfo: false,
      containsAddress: false,
      containsUrl: false,
      containsSocialHandle: false,
      containsMessagingApp: false,
      containsOffPlatformIntent: false,
      hasForbiddenContent: false,
    }
  }

  const raw = stripAllowedMapUrls(content)
  const lower = raw.toLowerCase()
  const collapsed = collapseSpaces(lower)
  const leetNorm = normaliseLeet(collapsed)

  const containsEmail =
    raw.includes('@') ||
    matchesAny(raw, [EMAIL_PATTERN]) ||
    matchesAny(raw, OBFUSCATION_PATTERNS)

  const containsPhone = matchesAny(raw, PHONE_PATTERNS) || hasSpacedDigitsPattern(raw)
  const containsUrl = matchesAny(raw, URL_PATTERNS)

  SOCIAL_HANDLE_PATTERN.lastIndex = 0
  const containsSocialHandle = SOCIAL_HANDLE_PATTERN.test(raw)

  const exactApp = containsPhrase(lower, MESSAGING_APPS_EXACT)
  let containsMessagingApp = Boolean(exactApp)
  if (!containsMessagingApp) {
    containsMessagingApp = FUZZY_BLOCKED_WORDS.some(
      (word) => leetNorm.includes(word) && !lower.includes(word)
    )
  }

  const containsOffPlatformIntent = Boolean(
    containsPhrase(lower, OFF_PLATFORM_PHRASES) ||
      containsPhrase(collapsed, OFF_PLATFORM_PHRASES) ||
      containsPhrase(lower, OFF_PLATFORM_ESCALATION_PHRASES) ||
      containsPhrase(collapsed, OFF_PLATFORM_ESCALATION_PHRASES)
  )

  const hasAreaMeasurement = AREA_MEASUREMENT_PATTERN.test(lower)
  const hasAddressKeyword = ADDRESS_KEYWORD_PATTERN.test(lower)
  const matchedStrongAddress = hasStrongAddressNumber(raw)
  const matchedIntentStreet = hasIntentTriggeredStreet(raw)
  const matchedAddressIntent = Boolean(
    containsPhrase(lower, ADDRESS_INTENT_PHRASES) ||
      containsPhrase(collapsed, ADDRESS_INTENT_PHRASES)
  )
  const saintStyleWithoutNumber = SAINT_STYLE_NAME_PATTERN.test(raw) && !/\b\d{1,5}[a-zA-Z]?\b/.test(raw)
  const containsAddress =
    !saintStyleWithoutNumber &&
    (
      matchedStrongAddress ||
      matchedIntentStreet ||
      // Keep legacy intent fallback for strict phrases only.
      matchedAddressIntent ||
      matchesAny(raw, ADDRESS_POSTCODE_PATTERNS)
    ) &&
    !(hasAreaMeasurement && !hasAddressKeyword)

  const hasCurrencySymbol = CURRENCY_SYMBOLS.some((s) => raw.includes(s))
  const hasCurrencyCode = CURRENCY_CODES.some((c) => new RegExp(`\\b${c}\\b`, 'i').test(raw))
  const paymentWord = containsPhrase(lower, PAYMENT_WORDS)
  const directPaymentWord = containsPhrase(lower, DIRECT_PAYMENT_WORDS)
  const containsPaymentInfo = Boolean(
    directPaymentWord ||
      (!options.allowPaymentTerms && (hasCurrencySymbol || hasCurrencyCode || paymentWord))
  )

  const hasForbiddenContent =
    containsEmail ||
    containsPhone ||
    containsUrl ||
    containsSocialHandle ||
    containsMessagingApp ||
    containsOffPlatformIntent ||
    containsAddress ||
    containsPaymentInfo

  return {
    containsEmail,
    containsPhone,
    containsPaymentInfo,
    containsAddress,
    containsUrl,
    containsSocialHandle,
    containsMessagingApp,
    containsOffPlatformIntent,
    hasForbiddenContent,
  }
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
  'To protect your payments and privacy, please keep your chat on Taskorilla until the task is booked. Once confirmed, you can share direct details!'

function blocked(overrides: Partial<ContentCheckResult>, reason: string): ContentCheckResult {
  return { ...CLEAN, isClean: false, message: BLOCK_MSG, detectedReason: reason, ...overrides }
}

export function checkForContactInfo(content: string, options: ContentFilterOptions = {}): ContentCheckResult {
  if (!content || typeof content !== 'string') return CLEAN

  // Allowlisted Google Maps URLs are stripped before all blocking checks.
  const raw = stripAllowedMapUrls(content)
  const lower = raw.toLowerCase()

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
  if (hasPhone) {
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
  const directPaymentWord = containsPhrase(lower, DIRECT_PAYMENT_WORDS)
  if (directPaymentWord) {
    return blocked({ containsPaymentInfo: true }, `direct payment instruction: ${directPaymentWord}`)
  }
  if (!options.allowPaymentTerms && (hasCurrencySymbol || hasCurrencyCode || paymentWord)) {
    return blocked(
      { containsPaymentInfo: true },
      paymentWord ? `payment: ${paymentWord}` : 'currency reference',
    )
  }

  // ── 9. Address sharing ─────────────────────────────────────────────────
  const hasAreaMeasurement = AREA_MEASUREMENT_PATTERN.test(lower)
  const hasAddressKeyword = ADDRESS_KEYWORD_PATTERN.test(lower)
  const saintStyleWithoutNumber = SAINT_STYLE_NAME_PATTERN.test(raw) && !/\b\d{1,5}[a-zA-Z]?\b/.test(raw)

  // 1) Strong number-based block first
  if (!saintStyleWithoutNumber && hasStrongAddressNumber(raw)) {
    if (!(hasAreaMeasurement && !hasAddressKeyword)) {
      return blocked({ containsAddress: true }, 'address number pattern')
    }
  }

  // 2) Intent-triggered numberless street-name block
  if (!saintStyleWithoutNumber && hasIntentTriggeredStreet(raw)) {
    if (!(hasAreaMeasurement && !hasAddressKeyword)) {
      return blocked({ containsAddress: true }, 'address intent street pattern')
    }
  }

  // 3) Fallback address intent checks
  const addressIntent = containsPhrase(lower, ADDRESS_INTENT_PHRASES)
  if (addressIntent) {
    if (!(hasAreaMeasurement && !hasAddressKeyword)) {
      return blocked({ containsAddress: true }, `address intent: ${addressIntent}`)
    }
  }
  const collapsedAddressIntent = containsPhrase(collapsed, ADDRESS_INTENT_PHRASES)
  if (collapsedAddressIntent) {
    if (!(hasAreaMeasurement && !hasAddressKeyword)) {
      return blocked({ containsAddress: true }, `obfuscated address intent: ${collapsedAddressIntent}`)
    }
  }

  if (!saintStyleWithoutNumber && matchesAny(raw, ADDRESS_POSTCODE_PATTERNS)) {
    return blocked({ containsAddress: true }, 'address postcode pattern')
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

export function getRestrictionHint(detectedReason: string | null): string {
  if (!detectedReason) return 'Please keep details general until payment is confirmed.'
  if (detectedReason.includes('address')) {
    return "Just the general area for now, please! (e.g., 'Near the Marina'). You can share the exact door number after booking."
  }
  if (detectedReason.includes('phone') || detectedReason.includes('email') || detectedReason.includes('social')) {
    return 'Whoops! Please remove phone numbers or emails for now. These are automatically shared with your Tasker once the job is confirmed.'
  }
  if (detectedReason.includes('messaging app') || detectedReason.includes('off-platform')) {
    return 'Please keep communication on Taskorilla until payment is confirmed.'
  }
  if (detectedReason.includes('payment') || detectedReason.includes('currency')) {
    return 'Please keep payment handling inside Taskorilla until payment is confirmed.'
  }
  return 'Please keep details general until payment is confirmed.'
}
