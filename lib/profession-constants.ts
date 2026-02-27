// Standard professions for helpers
// Used for the "Required Professional Roles" selection in task creation,
// plus helper filtering and other UI surfaces.

export const PROFESSION_GROUPS = [
  {
    heading: 'Health & Wellbeing',
    options: [
      'Therapist / Counsellor',
      'Life Coach',
      'Physiotherapist / Massage Therapist',
      'Personal Trainer / Fitness Coach',
      'Nutritionist / Dietitian',
      'Yoga / Pilates Instructor',
    ],
  },
  {
    heading: 'Beauty & Personal Care',
    options: [
      'Hairdresser / Barber',
      'Nail Technician / Manicurist',
      'Makeup Artist / Beauty Therapist',
    ],
  },
  {
    heading: 'Home & Lifestyle',
    options: [
      'Cleaner',
      'Handyman / Maintenance',
      'Chef / Personal Cook',
      'Interior Designer / Home Stylist',
      'Personal Stylist',
      'Pet Trainer / Dog Walker',
    ],
  },
  {
    heading: 'Business & Professional Services',
    options: [
      'Business Coach / Mentor',
      'Translation / Language Services',
      'Accountant / Bookkeeper',
      'Lawyer / Legal Consultant',
      'Marketing Consultant / Strategist',
      'Sales / Business Development',
      'Social Media Manager',
    ],
  },
  {
    heading: 'Creative & Media',
    options: [
      'Photographer / Videographer',
      'Graphic Designer / Illustrator',
      'Copywriter / Content Writer / Event Planner',
    ],
  },
  {
    heading: 'Science & Research',
    options: [
      'Scientist',
    ],
  },
] as const

export const STANDARD_PROFESSIONS = PROFESSION_GROUPS.flatMap((group) => group.options)

// Helper function to check if a helper has a matching profession
export function helperMatchesProfession(helper: any, profession: string): boolean {
  if (!profession || !helper.professions) return false
  
  const lowerProfession = profession.toLowerCase()
  return helper.professions.some((p: string) => 
    p.toLowerCase() === lowerProfession ||
    p.toLowerCase().includes(lowerProfession) ||
    lowerProfession.includes(p.toLowerCase())
  )
}

