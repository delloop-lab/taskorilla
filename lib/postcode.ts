const PORTUGAL_NAME = 'portugal'
const PORTUGAL_POSTCODE_DIGIT_COUNT = 7

const pickDigits = (value: string) => value.replace(/\D/g, '')

export const isPortugueseCountry = (country?: string) =>
  country?.trim().toLowerCase() === PORTUGAL_NAME

export const normalizePortuguesePostcode = (value: string): string | null => {
  const digits = pickDigits(value)
  if (digits.length < PORTUGAL_POSTCODE_DIGIT_COUNT) {
    return null
  }

  const area = digits.slice(0, 4)
  const suffix = digits.slice(4, 7)

  if (area.length !== 4 || suffix.length !== 3) {
    return null
  }

  return `${area}-${suffix}`
}

export const isPortuguesePostcode = (value: string): boolean =>
  normalizePortuguesePostcode(value) !== null

export const formatPostcodeForCountry = (value: string, country?: string): string => {
  if (!isPortugueseCountry(country)) {
    return value
  }

  const digits = pickDigits(value).slice(0, PORTUGAL_POSTCODE_DIGIT_COUNT)
  if (!digits) {
    return ''
  }

  if (digits.length <= 4) {
    return digits
  }

  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}








