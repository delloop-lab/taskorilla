export type PostingPlatform = 'Facebook' | 'Instagram' | 'LinkedIn' | 'X' | 'Threads' | 'WhatsApp'

export interface PostingGroup {
  id: string
  platform: PostingPlatform
  name: string
  url: string | null
  group_image: string | null
  days_between_posts: number
  description: string | null
  notes: string | null
  created_at: string
  // Facebook-specific metadata (e.g. whether group allows ads or only comments)
  facebook_post_mode?: string | null
}

export interface PostingPost {
  id: string
  group_id: string
  post_text: string
  post_media_url: string | null
  date_posted: string
  next_allowed_date: string | null
  notes: string | null
  created_at: string
  template_id: string | null
  pending_approval?: boolean | null
}

export interface PostingTemplate {
  id: string
  template_name: string
  post_text: string
  post_media_url: string | null
  platform: PostingPlatform | string
  notes: string | null
  created_at: string
}

export type PostingStatus = 'never' | 'ready' | 'waiting'

export interface GroupPostingMeta {
  groupId: string
  lastPost: PostingPost | null
  nextAllowedDate: string | null
  status: PostingStatus
  canPost: boolean
}

export interface PostingComment {
  id: string
  group_id: string
  number_of_comments: number
  date_commented: string
  notes: string | null
  created_at: string
}

export interface CommentStats {
  groupId: string
  lastCommentDate: string | null
  lastCommentNotes: string | null
  totalThisWeek: number
  nextAllowedDate: string | null
  canComment: boolean
}

