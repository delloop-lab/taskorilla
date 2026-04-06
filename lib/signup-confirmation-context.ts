/** sessionStorage: email + post-confirm path for resending Supabase signup emails. */
export const SIGNUP_CONFIRMATION_STORAGE_KEY = 'taskorilla_signup_confirm_context'

export type SignupConfirmationContext = {
  email: string
  nextPath: string
}

export function saveSignupConfirmationContext(ctx: SignupConfirmationContext): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SIGNUP_CONFIRMATION_STORAGE_KEY, JSON.stringify(ctx))
  } catch {
    // ignore quota / private mode
  }
}

export function readSignupConfirmationContext(): SignupConfirmationContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SIGNUP_CONFIRMATION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SignupConfirmationContext
    if (typeof parsed?.email !== 'string' || typeof parsed?.nextPath !== 'string') return null
    return parsed
  } catch {
    return null
  }
}
