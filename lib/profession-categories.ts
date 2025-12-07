// Structured profession categories and subcategories
// Used for professional helper profile editing

export interface ProfessionCategory {
  name: string
  subs: string[]
}

export const PROFESSION_CATEGORIES: ProfessionCategory[] = [
  {
    name: 'Health and Wellbeing',
    subs: [
      'Therapist',
      'Counsellor',
      'Life Coach',
      'Yoga Instructor',
      'Pilates Instructor',
      'Personal Trainer',
      'Nutritionist',
      'Reiki Practitioner',
      'Breathwork Coach',
      'Meditation Teacher',
      'Massage Therapist',
      'Holistic Practitioner'
    ]
  },
  {
    name: 'Business and Marketing Services',
    subs: [
      'Marketing Consultant',
      'Social Media Manager',
      'SEO Specialist',
      'Copywriter',
      'Brand Strategist',
      'Graphic Designer',
      'Website Designer',
      'Content Creator',
      'Email Marketing Specialist',
      'Business Coach',
      'Virtual Assistant'
    ]
  },
  {
    name: 'Creative and Media',
    subs: [
      'Photographer',
      'Videographer',
      'Video Editor',
      'Graphic Artist',
      'Animator',
      'Voiceover Artist',
      'Podcast Editor',
      'Music Producer',
      'DJ',
      'Illustrator'
    ]
  },
  {
    name: 'Medical and Clinical',
    subs: [
      'Dentist',
      'Physiotherapist',
      'Chiropractor',
      'Optometrist',
      'Podiatrist',
      'Occupational Therapist',
      'Speech Therapist',
      'Clinical Psychologist',
      'Dietitian'
    ]
  },
  {
    name: 'Education and Personal Development',
    subs: [
      'Tutor',
      'Language Teacher',
      'Music Teacher',
      'Career Coach',
      'Study Coach',
      'Test Prep Specialist',
      'Parenting Coach'
    ]
  },
  {
    name: 'Events and Experiences',
    subs: [
      'Event Planner',
      'Party Planner',
      'Caterer',
      'Baker',
      'Balloon Stylist',
      'Decorator',
      'Face Painter',
      'Entertainer',
      'MC'
    ]
  },
  {
    name: 'Tech and Digital Services',
    subs: [
      'Web Developer',
      'App Developer',
      'IT Support',
      'Cybersecurity Specialist',
      'Data Analyst',
      'AI Consultant',
      'Tech Troubleshooting'
    ]
  }
]

// Flatten all professions into a single array for backward compatibility
export const ALL_PROFESSIONS = PROFESSION_CATEGORIES.flatMap(category => category.subs)





