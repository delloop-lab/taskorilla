export interface RecentReview {
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer?: {
    full_name?: string
  }
}

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
  recentReviews?: RecentReview[]
  is_tasker?: boolean
  is_helper?: boolean
  bio?: string | null
  skills?: string[] | null
  services_offered?: string[] | null
  professional_offerings?: string[] | null
  badges?: string[] | null
  hourly_rate?: number | null
  profile_slug?: string | null
  qualifications?: string[] | null
  professions?: string[] | null
  is_featured?: boolean | null
  iban?: string | null
  paypal_email?: string | null
  languages?: string[] | null // Languages the user speaks (e.g., ["English", "Portuguese"])
  completedTasks?: number
  userRatings?: {
    reviewee_id: string
    tasker_avg_rating: number | null
    tasker_review_count: number
    helper_avg_rating: number | null
    helper_review_count: number
  } | null
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
  status: 'open' | 'pending_payment' | 'in_progress' | 'completed' | 'cancelled'
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
  required_skills?: string[] | null // Skills required for this task
  required_professions?: string[] | null // Professional roles required for this task
  user?: User
  category_obj?: Category
  sub_category_obj?: Category
  tags?: Tag[]
  distance?: number // Calculated distance in km
  archived?: boolean
  images?: TaskImage[] // Multiple images
  completion_photos?: TaskCompletionPhoto[] // Completion proof photos
  progress_updates?: TaskProgressUpdate[] // Progress updates
  willing_to_help?: boolean // Task poster is willing to help with the task
  hidden_by_admin?: boolean // Set to true when admin hides the task
  hidden_reason?: string | null // Reason why task was hidden
  hidden_at?: string | null // Timestamp when task was hidden
  hidden_by?: string | null // Admin user ID who hid the task
  // Payment tracking fields
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | null
  payment_intent_id?: string | null
  payout_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'simulated' | null
  payout_id?: string | null
  payment_provider?: string | null
  assigned_to_user?: User
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
  image_url?: string | null // Optional image attachment
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
  task?: Task
}

export interface TaskProgressUpdate {
  id: string
  task_id: string
  user_id: string
  message?: string | null
  image_url?: string | null
  created_at: string
  user?: User
}


