export interface User {
  id: string
  email: string
  full_name?: string
  company_name?: string | null
  avatar_url?: string | null
  postcode?: string | null
  country?: string | null
  phone_country_code?: string | null
  phone_number?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at: string
  rating?: number | null
  reviewCount?: number
}

export interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  parent?: Category
  children?: Category[]
}

export interface Tag {
  id: string
  name: string
  slug: string
  created_at: string
}

export interface TaskImage {
  id: string
  task_id: string
  image_url: string
  display_order: number
  created_at: string
}

export interface TaskCompletionPhoto {
  id: string
  task_id: string
  image_url: string
  uploaded_by: string
  created_at: string
  uploader?: User
}

export interface Task {
  id: string
  title: string
  description: string
  budget: number
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string
  assigned_to?: string
  created_at: string
  updated_at: string
  category?: string // Legacy field - keep for backward compatibility
  category_id?: string | null
  sub_category_id?: string | null
  location?: string
  postcode?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
  due_date?: string
  image_url?: string | null // Legacy field - kept for backward compatibility
  user?: User
  category_obj?: Category
  sub_category_obj?: Category
  tags?: Tag[]
  distance?: number // Calculated distance in km
  archived?: boolean
  images?: TaskImage[] // Multiple images
  completion_photos?: TaskCompletionPhoto[] // Completion proof photos
  willing_to_help?: boolean // Task poster is willing to help with the task
}

export interface Bid {
  id: string
  task_id: string
  user_id: string
  amount: number
  message: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  user?: User
  task?: Task
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  is_read?: boolean
  sender?: User
  receiver?: User
}

export interface Conversation {
  id: string
  task_id: string
  participant1_id: string
  participant2_id: string
  created_at: string
  updated_at: string
  task?: Task
  participant1?: User
  participant2?: User
  last_message?: Message
}

export interface Review {
  id: string
  task_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment?: string
  created_at: string
  reviewer?: User
  reviewee?: User
}


