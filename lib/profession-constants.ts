// Standard professions for helpers — grouped to mirror the task category tree in the DB.
// Used for the "Required Professional Roles" selection in task creation,
// helper filtering, and other UI surfaces.

export const PROFESSION_GROUPS = [
  {
    heading: 'Cleaning & Home Services',
    options: [
      'House Cleaner',
      'Office Cleaner',
      'Carpet Cleaner',
      'Window Cleaner',
      'End-of-Lease Cleaner',
      'Ironing / Laundry',
      'Organiser / Declutterer',
    ],
  },
  {
    heading: 'Home & Garden',
    options: [
      'Gardener',
      'Lawn Mowing',
      'Landscaper',
      'Painter (Interior / Exterior)',
      'Fencing',
      'Decking',
      'Pool Maintenance',
    ],
  },
  {
    heading: 'Handyman & Maintenance',
    options: [
      'Handyman / General Repairs',
      'Plumber',
      'Electrician',
      'Carpenter',
      'Furniture Assembler',
      'Tiler',
      'Mounting & Installation',
    ],
  },
  {
    heading: 'Moving & Delivery',
    options: [
      'Removalist',
      'Delivery Driver',
      'Packer / Unpacker',
      'Heavy Lifter / Loader',
      'Courier / Errand Runner',
    ],
  },
  {
    heading: 'Tech & IT',
    options: [
      'IT Support',
      'Computer Repair',
      'Phone / Tablet Repair',
      'Web Developer',
      'App Developer',
      'Smart Home Setup',
      'Data Entry',
    ],
  },
  {
    heading: 'Events, Photography & Media',
    options: [
      'Event Planner',
      'Photographer',
      'Videographer',
      'Video Editor',
      'Graphic Designer',
      'Caterer',
      'DJ / Entertainer',
    ],
  },
  {
    heading: 'Business & Professional Services',
    options: [
      'Virtual Assistant',
      'Bookkeeper / Accountant',
      'Marketing Consultant',
      'Social Media Manager',
      'Copywriter / Content Writer',
      'Business Coach',
      'Translator',
    ],
  },
  {
    heading: 'Tutoring & Lessons',
    options: [
      'Academic Tutor',
      'Language Teacher',
      'Music Teacher',
      'Driving Instructor',
      'Sports Coach',
      'Art Teacher',
    ],
  },
  {
    heading: 'Health & Beauty',
    options: [
      'Hairdresser / Barber',
      'Nail Technician',
      'Makeup Artist',
      'Massage Therapist',
      'Personal Trainer',
      'Yoga / Pilates Instructor',
      'Nutritionist',
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
