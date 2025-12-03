// Standard professions for helpers
// These are specific professional roles helpers can select

export const STANDARD_PROFESSIONS = [
  'Hairdresser / Barber',
  'Nail Technician / Manicurist',
  'Makeup Artist / Beauty Consultant',
  'Massage Therapist / Physiotherapist',
  'Personal Trainer / Fitness Coach',
  'Yoga / Pilates Instructor',
  'Therapist / Coach',
  'Mentor / Coach',
  'Marketing Consultant / Strategist',
  'Social Media Manager',
  'Sales Representative / Business Development',
  'Graphic Designer / Illustrator',
  'Web Developer / Front-End Developer',
  'Photographer / Videographer',
  'Accountant / Bookkeeper',
  'Lawyer / Legal Consultant',
  'Tutor / Educational Coach',
  'Event Planner / Coordinator',
  'Chef / Personal Cook',
  'Copywriter / Content Writer',
  'Interior Designer / Home Stylist',
  'IT Support / Tech Specialist'
]

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

