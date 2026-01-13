/**
 * SurveyJS Theme Manager
 * 
 * IMPORTANT: SurveyJS themes must be imported upfront - they don't dynamically load CSS.
 * This manager only toggles the data-theme attribute, and CSS handles showing/hiding themes.
 */

export type SurveyJSTheme = 'default' | 'defaultV2' | 'modern' | 'custom'

let currentTheme: SurveyJSTheme = 'modern' // Default to modern

/**
 * Set the active theme by updating the data-theme attribute
 * CSS will handle showing/hiding the appropriate theme styles
 */
export function loadTheme(theme: SurveyJSTheme): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Theme Manager] Setting theme: ${theme}`)
  }
  
  // Update data attribute on survey wrapper
  const surveyWrapper = document.querySelector('.surveyjs-form-wrapper') as HTMLElement
  if (surveyWrapper) {
    surveyWrapper.setAttribute('data-theme', theme)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Theme Manager] Updated survey wrapper data-theme to: ${theme}`)
    }
    
    // Force immediate visual update
    surveyWrapper.style.display = 'none'
    surveyWrapper.offsetHeight // Force reflow
    surveyWrapper.style.display = ''
  }
  
  currentTheme = theme
}

/**
 * Get the currently active theme
 */
export function getCurrentTheme(): SurveyJSTheme {
  return currentTheme
}

/**
 * Initialize theme on mount
 */
export function initializeTheme(initialTheme: SurveyJSTheme = 'modern'): void {
  loadTheme(initialTheme)
}
