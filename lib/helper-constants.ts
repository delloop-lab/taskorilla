// Standard skills and services for helpers
// These are the predefined options helpers can choose from

export const STANDARD_SKILLS = [
  'Handyman / Repairs',
  'Cleaning / Housekeeping',
  'Gardening / Lawn Care',
  'Moving / Heavy Lifting',
  'Furniture Assembly',
  'Delivery / Errands',
  'Pet Care / Dog Walking',
  'Babysitting / Childcare',
  'Tech Support / Computer Help',
  'Tutoring / Teaching',
  'Personal Assistance / Admin Tasks',
  'Painting / Home Improvement',
  'Event Setup / Assistance',
  'Shopping / Grocery Pickup',
  'Odd Jobs / Miscellaneous'
]

export const STANDARD_SERVICES = [
  'Home Repairs & Maintenance',
  'Cleaning & Organising',
  'Yard Work & Gardening',
  'Furniture Assembly & Setup',
  'Moving & Transport Assistance',
  'Pet Care & Walking',
  'Childcare & Babysitting',
  'Tech Support & Computer Help',
  'Tutoring & Lessons',
  'Personal / Virtual Assistance',
  'Painting & Home Improvement',
  'Event Help & Setup',
  'Shopping & Delivery',
  'General Odd Jobs'
]

// Helper function to check if search term matches any standard skill or service
export function matchesStandardSkillOrService(searchTerm: string): string[] {
  const lowerSearch = searchTerm.toLowerCase()
  const matches: string[] = []
  
  STANDARD_SKILLS.forEach(skill => {
    if (skill.toLowerCase().includes(lowerSearch)) {
      matches.push(skill)
    }
  })
  
  STANDARD_SERVICES.forEach(service => {
    if (service.toLowerCase().includes(lowerSearch)) {
      matches.push(service)
    }
  })
  
  return matches
}

// Helper function to check if a helper has a matching skill or service
export function helperMatchesSearch(helper: any, searchTerm: string): boolean {
  if (!searchTerm) return true
  
  const lowerSearch = searchTerm.toLowerCase().trim()
  
  // Check name
  if (helper.full_name?.toLowerCase().includes(lowerSearch)) {
    return true
  }
  
  // Check bio
  if (helper.bio?.toLowerCase().includes(lowerSearch)) {
    return true
  }
  
  // Check skills (exact match or partial match)
  if (helper.skills?.some((skill: string) => {
    const lowerSkill = skill.toLowerCase()
    return lowerSkill.includes(lowerSearch) || lowerSearch.includes(lowerSkill)
  })) {
    return true
  }
  
  // Check if search term matches any standard skill (even if helper hasn't added it yet)
  // This allows searching for "handyman" to find helpers with "Handyman / Repairs"
  const matchingStandardSkills = STANDARD_SKILLS.filter(skill => 
    skill.toLowerCase().includes(lowerSearch) || lowerSearch.includes(skill.toLowerCase())
  )
  if (matchingStandardSkills.length > 0 && helper.skills?.some((skill: string) => 
    matchingStandardSkills.some(stdSkill => {
      const lowerStdSkill = stdSkill.toLowerCase()
      const lowerHelperSkill = skill.toLowerCase()
      return lowerStdSkill === lowerHelperSkill || 
             lowerStdSkill.includes(lowerHelperSkill) || 
             lowerHelperSkill.includes(lowerStdSkill)
    })
  )) {
    return true
  }
  
  // Check services_offered (exact match or partial match)
  if (helper.services_offered?.some((service: string) => {
    const lowerService = service.toLowerCase()
    return lowerService.includes(lowerSearch) || lowerSearch.includes(lowerService)
  })) {
    return true
  }
  
  // Check if search term matches any standard service (even if helper hasn't added it yet)
  const matchingStandardServices = STANDARD_SERVICES.filter(service => 
    service.toLowerCase().includes(lowerSearch) || lowerSearch.includes(service.toLowerCase())
  )
  if (matchingStandardServices.length > 0 && helper.services_offered?.some((service: string) => 
    matchingStandardServices.some(stdService => {
      const lowerStdService = stdService.toLowerCase()
      const lowerHelperService = service.toLowerCase()
      return lowerStdService === lowerHelperService || 
             lowerStdService.includes(lowerHelperService) || 
             lowerHelperService.includes(lowerStdService)
    })
  )) {
    return true
  }
  
  // Check qualifications
  if (helper.qualifications?.some((qual: string) => qual.toLowerCase().includes(lowerSearch))) {
    return true
  }
  
  // Check professions
  if (helper.professions?.some((profession: string) => {
    const lowerProfession = profession.toLowerCase()
    return lowerProfession.includes(lowerSearch) || lowerSearch.includes(lowerProfession)
  })) {
    return true
  }
  
  return false
}

