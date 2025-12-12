# Translation Guide - Adding Portuguese (PT) Language Support

## Overview

Taskorilla now supports English (EN) and Portuguese (PT) languages. The translation system is set up and working. Here's how to add more translations.

## How It Works

1. **Translation Files**: Located in `locales/` directory
   - `locales/en.json` - English translations
   - `locales/pt.json` - Portuguese translations

2. **Translation Structure**: Uses nested keys like `"navbar.tasks"` or `"homepage.tagline"`

3. **Using Translations**: In any component, use the `useLanguage` hook:
   ```tsx
   import { useLanguage } from '@/lib/i18n'
   
   function MyComponent() {
     const { t, language, setLanguage } = useLanguage()
     
     return <div>{t('navbar.tasks')}</div>
   }
   ```

## Adding New Translations

### Step 1: Add to English File (`locales/en.json`)

Add your translation key and English text:
```json
{
  "mySection": {
    "myKey": "My English Text"
  }
}
```

### Step 2: Add Portuguese Translation (`locales/pt.json`)

Add the same key structure with Portuguese text:
```json
{
  "mySection": {
    "myKey": "Meu Texto em Português"
  }
}
```

### Step 3: Use in Component

```tsx
'use client'  // Required for hooks

import { useLanguage } from '@/lib/i18n'

export default function MyComponent() {
  const { t } = useLanguage()
  
  return <p>{t('mySection.myKey')}</p>
}
```

## Current Translation Keys

### Common (`common.*`)
- `welcome`, `loading`, `save`, `cancel`, `delete`, `edit`, `close`, `submit`, `search`, `filter`, `sort`, `next`, `previous`, `back`, `continue`, `yes`, `no`

### Navbar (`navbar.*`)
- `tasks`, `postTask`, `browseTasks`, `helpers`, `browseAllHelpers`, `browseProfessionals`, `help`, `helpCenter`, `faqs`, `guides`, `contactSupport`, `login`, `signup`, `logout`, `profile`, `myTasks`, `bidsOnYourTasks`, `acceptedBids`, `pendingReviews`

### Homepage (`homepage.*`)
- `tagline`, `description1`, `description2`, `postTask`, `postTaskSubtitle`, `browseTasks`, `browseTasksSubtitle`

### Language (`language.*`)
- `english`, `portuguese`, `switchToEnglish`, `switchToPortuguese`

## Examples

### Example 1: Adding a Button Translation

**English (`locales/en.json`):**
```json
{
  "buttons": {
    "submit": "Submit",
    "cancel": "Cancel"
  }
}
```

**Portuguese (`locales/pt.json`):**
```json
{
  "buttons": {
    "submit": "Submeter",
    "cancel": "Cancelar"
  }
}
```

**Usage:**
```tsx
const { t } = useLanguage()
<button>{t('buttons.submit')}</button>
```

### Example 2: Adding Dynamic Content

For content with variables, use template strings:
```tsx
// In component
const { t } = useLanguage()
const userName = "João"

// In translation file
{
  "greeting": "Hello, {{name}}!"
}

// Usage (you'll need to replace manually or use a library)
const greeting = t('greeting').replace('{{name}}', userName)
```

## Best Practices

1. **Organize by Section**: Group related translations (e.g., `navbar.*`, `homepage.*`, `tasks.*`)

2. **Use Descriptive Keys**: `navbar.postTask` is better than `navbar.pt`

3. **Keep Structure Consistent**: Maintain the same structure in both EN and PT files

4. **Test Both Languages**: Always test switching between EN and PT to ensure translations work

5. **Fallback Behavior**: If a translation key is missing, the key itself will be displayed (e.g., `navbar.missingKey`)

## Components Already Using Translations

- ✅ `components/Navbar.tsx` - All menu items
- ✅ `app/page.tsx` - Homepage hero section

## Next Steps

To add translations to more components:

1. Identify hardcoded English text
2. Add keys to both `en.json` and `pt.json`
3. Import `useLanguage` hook
4. Replace hardcoded text with `t('your.key')`
5. Test by switching languages using the EN/PT buttons in the navbar

## Need Help?

- Check existing translations in `locales/en.json` and `locales/pt.json`
- Look at `components/Navbar.tsx` for examples
- The translation system automatically loads the correct language file based on user selection








