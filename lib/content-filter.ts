/**
 * Content filter utility to detect and block contact information and payment discussions
 * Prevents users from sharing email addresses, phone numbers, and payment details
 * to ensure all communication and payments stay on the platform for safety
 */

// Email pattern - catches most email formats
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi

// Phone patterns - catches various formats:
// +353 87 123 4567, 087-123-4567, (087) 123 4567, 0871234567, +1-555-123-4567
const PHONE_PATTERNS = [
  /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International format
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // US format: 555-123-4567
  /\b\d{2,4}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Various formats
  /\(\d{2,4}\)\s*\d{3}[-.\s]?\d{4}/g, // (087) 123 4567
  /\b0\d{2}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // Irish/UK mobile: 087 123 4567
  /\+\d{1,4}\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}/g, // +353 87 123 4567
]

// Common obfuscation attempts for emails
const OBFUSCATION_PATTERNS = [
  /[a-zA-Z0-9._%+-]+\s*\[\s*at\s*\]\s*[a-zA-Z0-9.-]+\s*\[\s*dot\s*\]\s*[a-zA-Z]{2,}/gi, // user [at] domain [dot] com
  /[a-zA-Z0-9._%+-]+\s*\(\s*at\s*\)\s*[a-zA-Z0-9.-]+\s*\(\s*dot\s*\)\s*[a-zA-Z]{2,}/gi, // user (at) domain (dot) com
  /[a-zA-Z0-9._%+-]+\s+at\s+[a-zA-Z0-9.-]+\s+dot\s+[a-zA-Z]{2,}/gi, // user at domain dot com
]

// Currency symbols
const CURRENCY_SYMBOLS = ['$', '€', '£', '¥', '₹', '₽', '₿', '฿', '₴', '₦', '₱', '₫', '₩', '₪', 'zł', 'kr', 'R$']

// Currency codes (ISO 4217)
const CURRENCY_CODES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD', 'CHF', 'NZD',
  'HKD', 'SGD', 'SEK', 'NOK', 'DKK', 'MXN', 'BRL', 'ZAR', 'RUB', 'KRW',
  'THB', 'PLN', 'TRY', 'AED', 'SAR', 'PHP', 'IDR', 'MYR', 'VND', 'CZK',
  'ILS', 'CLP', 'PEN', 'COP', 'ARS', 'EGP', 'PKR', 'BDT', 'NGN', 'UAH',
]

// Payment-related words to block
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
  'off platform', 'off-platform', 'outside the app', 'outside platform',
  'direct payment', 'pay directly', 'pay direct',
  'cent', 'cents', 'pence', 'quid', 'buck', 'bucks',
]

export interface ContentCheckResult {
  isClean: boolean
  containsEmail: boolean
  containsPhone: boolean
  containsPaymentInfo: boolean
  message: string
}

/**
 * Check if content contains email addresses, phone numbers, or payment information
 */
export function checkForContactInfo(content: string): ContentCheckResult {
  if (!content || typeof content !== 'string') {
    return { isClean: true, containsEmail: false, containsPhone: false, containsPaymentInfo: false, message: '' }
  }

  const normalizedContent = content.toLowerCase()
  
  // Simple @ symbol check - block any message containing @
  const hasAtSymbol = content.includes('@')
  
  // Check for email addresses using fresh regex (avoid lastIndex issues with global flag)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i
  const hasEmailPattern = emailRegex.test(content)
  
  // Check obfuscation patterns
  const hasObfuscatedEmail = OBFUSCATION_PATTERNS.some(pattern => {
    pattern.lastIndex = 0 // Reset before test
    return pattern.test(content)
  })
  
  // Block if @ symbol is present (strictest) or email pattern matches
  const hasEmail = hasAtSymbol || hasEmailPattern || hasObfuscatedEmail

  // Check for phone numbers
  const digitsOnly = content.replace(/[^\d]/g, '')
  const hasPhone = PHONE_PATTERNS.some(pattern => {
    pattern.lastIndex = 0 // Reset before test
    return pattern.test(content)
  })

  // Additional check: if there are 7+ consecutive/grouped digits, likely a phone number
  const suspiciousDigitGroups = /\d{7,}|\d{3,4}[-.\s]\d{3,4}[-.\s]\d{3,4}/g.test(content)
  const containsPhone = hasPhone || (digitsOnly.length >= 7 && suspiciousDigitGroups)

  // Check for currency symbols
  const hasCurrencySymbol = CURRENCY_SYMBOLS.some(symbol => content.includes(symbol))

  // Check for currency codes (as whole words, case insensitive)
  const hasCurrencyCode = CURRENCY_CODES.some(code => {
    const regex = new RegExp(`\\b${code}\\b`, 'i')
    return regex.test(content)
  })

  // Check for payment-related words
  const hasPaymentWord = PAYMENT_WORDS.some(word => {
    // For multi-word phrases, check directly
    if (word.includes(' ')) {
      return normalizedContent.includes(word)
    }
    // For single words, check as whole words
    const regex = new RegExp(`\\b${word}s?\\b`, 'i') // Include optional 's' for plurals
    return regex.test(content)
  })

  const containsEmail = hasEmail
  const containsPaymentInfo = hasCurrencySymbol || hasCurrencyCode || hasPaymentWord

  // Build response based on what was found
  const issues: string[] = []
  if (containsEmail) issues.push('email addresses')
  if (containsPhone) issues.push('phone numbers')
  if (containsPaymentInfo) issues.push('payment information or currency references')

  if (issues.length > 0) {
    return {
      isClean: false,
      containsEmail,
      containsPhone,
      containsPaymentInfo,
      message: 'For safety, do not share phone numbers or emails. All messages and payments must stay on the platform. After payment, you and your helper can exchange contact info if needed.',
    }
  }

  return { isClean: true, containsEmail: false, containsPhone: false, containsPaymentInfo: false, message: '' }
}

/**
 * Sanitize content by removing/masking contact and payment information
 * Use this if you want to allow the message but redact the sensitive info
 */
export function sanitizeContactInfo(content: string): string {
  if (!content || typeof content !== 'string') {
    return content
  }

  let sanitized = content

  // Replace emails
  sanitized = sanitized.replace(EMAIL_PATTERN, '[email removed]')
  
  // Replace obfuscated emails
  OBFUSCATION_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[email removed]')
  })

  // Replace phone numbers
  PHONE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[phone removed]')
  })

  // Replace currency symbols
  CURRENCY_SYMBOLS.forEach(symbol => {
    sanitized = sanitized.split(symbol).join('[currency removed]')
  })

  // Replace currency codes
  CURRENCY_CODES.forEach(code => {
    const regex = new RegExp(`\\b${code}\\b`, 'gi')
    sanitized = sanitized.replace(regex, '[currency removed]')
  })

  // Replace payment words
  PAYMENT_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}s?\\b`, 'gi')
    sanitized = sanitized.replace(regex, '[removed]')
  })

  return sanitized
}

/**
 * Validate message content - throws error if prohibited content found
 * Use this for strict validation
 */
export function validateMessageContent(content: string): void {
  const result = checkForContactInfo(content)
  if (!result.isClean) {
    throw new Error(result.message)
  }
}
