// Structured profession categories and subcategories — mirrors the task DB category tree.
// Used for professional helper profile editing.

export interface ProfessionCategory {
  name: string
  subs: string[]
}

export const PROFESSION_CATEGORIES: ProfessionCategory[] = [
  {
    name: 'Cleaning & Home Services',
    subs: [
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
    name: 'Home & Garden',
    subs: [
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
    name: 'Handyman & Maintenance',
    subs: [
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
    name: 'Moving & Delivery',
    subs: [
      'Removalist',
      'Delivery Driver',
      'Packer / Unpacker',
      'Heavy Lifter / Loader',
      'Courier / Errand Runner',
    ],
  },
  {
    name: 'Tech & IT',
    subs: [
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
    name: 'Events, Photography & Media',
    subs: [
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
    name: 'Business & Professional Services',
    subs: [
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
    name: 'Tutoring & Lessons',
    subs: [
      'Academic Tutor',
      'Language Teacher',
      'Music Teacher',
      'Driving Instructor',
      'Sports Coach',
      'Art Teacher',
    ],
  },
  {
    name: 'Health & Beauty',
    subs: [
      'Hairdresser / Barber',
      'Nail Technician',
      'Makeup Artist',
      'Massage Therapist',
      'Personal Trainer',
      'Yoga / Pilates Instructor',
      'Nutritionist',
    ],
  },
]

// Flatten all professions into a single array for backward compatibility
export const ALL_PROFESSIONS = PROFESSION_CATEGORIES.flatMap((category) => category.subs)
