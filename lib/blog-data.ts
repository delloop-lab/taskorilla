// Blog data structure - placeholder array that will later be populated with AI-generated content

export interface ContentBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'li'
  text: string
}

export interface BlogPost {
  title: string
  category: string
  snippet: string // First 150 characters of content
  date: string // ISO date string
  location?: string
  slug: string
  content?: string | ContentBlock[] // Full post content - can be string or structured content blocks
  metaDescription?: string // SEO meta description (~150-160 characters)
  featuredImageUrl?: string // Main image URL for OG/Twitter cards (1200x630 recommended) - DEPRECATED: use ogImage
  ogImage?: string // OG image URL for social sharing (1200x630) - DEPRECATED: use ogImageUpload
  ogImageUpload?: string // Path to manually uploaded OG image (e.g., /images/blog/og/[slug].png) - HIGHEST PRIORITY
  tags?: string[] // Article tags for SEO and categorization
  cta?: string // Call to action text
}

// Placeholder blog posts - this array will be populated with AI-generated content in the future
export const blogs: BlogPost[] = [
  {
    title: "Welcome to Taskorilla: Your Local Service Marketplace",
    category: "Platform Updates",
    snippet: "Discover how Taskorilla connects you with skilled helpers in the Algarve. Whether you need a plumber, electrician, or handyman, our platform makes it easy to find trusted professionals.",
    date: "2025-01-15",
    location: "Algarve",
    slug: "welcome-to-taskorilla",
    content: [
      { type: "h2", text: "Welcome to Taskorilla" },
      { type: "p", text: "Your Local Service Marketplace" },
      { type: "h2", text: "What is Taskorilla" },
      { type: "p", text: "Discover how Taskorilla connects you with skilled helpers in the Algarve. Whether you need a plumber, electrician, or handyman, our platform makes it easy to find trusted professionals." },
      { type: "h2", text: "How does Taskorilla work?" },
      { type: "p", text: "Taskorilla is designed to make local services accessible and convenient. Post your task, receive bids from qualified helpers, and get the job done quickly and efficiently." },
      { type: "h2", text: "Taskorilla features:" },
      { type: "p", text: "- Easy task posting\n- Verified helpers\n- Secure payments\n- Real-time communication" }
    ],
    metaDescription: "Taskorilla connects you with skilled helpers in the Algarve. Whether a plumber, electrician etc, our platform makes it easy to find trusted professionals.",
    ogImageUpload: "/images/blog/og/welcome-to-taskorilla.jpg",
    cta: "Join us today and experience the future of local services!",
  },

  {
    title: "How to Find a Reliable Plumber in Faro",
    category: "Plumbing",
    snippet: "Finding a reliable plumber in Faro can be tricky. Here's how to hire someone trustworthy and quick without the stress...",
    date: "2026-01-16",
    location: "Faro",
    slug: "how-to-find-a-reliable-plumber-faro",
    content: [
      { type: "h2", text: "Step 1: Ask for Recommendations" },
      { type: "p", text: "Reach out to friends, neighbours, or local social groups in Faro for trusted plumbers. Personal recommendations save time and stress." },
      { type: "h2", text: "Step 2: Check Online Reviews" },
      { type: "p", text: "Look for reviews on Taskorilla and other platforms. Verified reviews help you avoid unreliable service providers." },
      { type: "h2", text: "Step 3: Verify Credentials" },
      { type: "p", text: "Ensure the plumber is licensed and insured. Always ask for proof before any work begins." },
      { type: "h2", text: "Step 4: Compare Quotes" },
      { type: "p", text: "Get at least 2–3 quotes from different plumbers in Faro. Compare pricing and scope of work to avoid surprises." },
      { type: "h2", text: "Step 5: Schedule & Communicate" },
      { type: "p", text: "Once you choose a plumber, schedule the work and confirm all details in writing. Clear communication prevents misunderstandings." },
      { type: "h2", text: "Conclusion" },
      { type: "p", text: "Finding a reliable plumber in Faro doesn't have to be stressful. Follow these steps and use Taskorilla to connect with verified professionals." }
    ],
    metaDescription: "Looking for a trusted plumber in Faro? Taskorilla helps you find verified local professionals quickly and easily, making hiring reliable plumbing stress-free.",
    ogImageUpload: "/images/blog/og/how-to-find-a-reliable-plumber-faro.jpg",
    cta: "Find a verified plumber in Faro on Taskorilla",
  },

  {
    title: "Tips for Hiring an Electrician in Lagos",
    category: "Electrical",
    snippet: "Hiring an electrician in Lagos doesn't need to be complicated. Follow these tips to hire safely and efficiently...",
    date: "2026-01-16",
    location: "Lagos",
    slug: "tips-for-hiring-an-electrician-lagos",
    content: [
      { type: "h2", text: "Check Qualifications" },
      { type: "p", text: "Ensure the electrician has proper licenses and insurance before any work starts." },
      { type: "h2", text: "Ask for Recommendations" },
      { type: "p", text: "Speak with locals or look at reviews on Taskorilla to find trustworthy professionals." },
      { type: "h2", text: "Compare Quotes" },
      { type: "p", text: "Get multiple quotes and check the scope of work to avoid surprises." },
      { type: "h2", text: "Schedule Work" },
      { type: "p", text: "Agree on a schedule and confirm all details in writing to ensure smooth execution." }
    ],
    metaDescription: "Need an electrician in Lagos? Taskorilla will help you quickly and safely find verified local professionals, making it easy to hire reliable help today.",
    ogImageUpload: "/images/blog/og/tips-for-hiring-an-electrician-lagos.jpg",
    cta: "Find a verified electrician in Lagos on Taskorilla",
  },

  {
    title: "Tips for Hiring a Handyman in Vilamoura",
    category: "Home Maintenance",
    snippet: "Finding a handyman in Vilamoura is easy if you follow these tips for hiring a verified local professional...",
    date: "2026-01-16",
    location: "Vilamoura",
    slug: "tips-for-hiring-a-handyman-vilamoura",
    content: [
      { type: "h2", text: "Ask for Recommendations" },
      { type: "p", text: "Friends and neighbours often know skilled handymen in Vilamoura." },
      { type: "h2", text: "Check Credentials" },
      { type: "p", text: "Ensure proper licensing and insurance for safety." },
      { type: "h2", text: "Compare Quotes" },
      { type: "p", text: "Get 2–3 quotes to find fair pricing." }
    ],
    metaDescription: "Need a handyman in Vilamoura? Taskorilla helps you quickly find reliable local professionals for any household job, big or small, safely and easily today!",
    ogImageUpload: "/images/blog/og/tips-for-hiring-a-handyman-vilamoura.jpg",
    cta: "Find verified handymen in Vilamoura on Taskorilla",
  },

  {
    title: "Handyman Services in Loulé: What You Need to Know",
    category: "Home Maintenance",
    snippet: "Finding a handyman in Loulé is easy if you follow these simple tips for hiring verified local professionals...",
    date: "2026-01-16",
    location: "Loulé",
    slug: "handyman-services-loule",
    content: [
      { type: "h2", text: "Get Recommendations" },
      { type: "p", text: "Ask friends and neighbors for trusted handymen in Loulé." },
      { type: "h2", text: "Check Credentials" },
      { type: "p", text: "Ensure licensing, insurance, and previous experience for safety and quality." },
      { type: "h2", text: "Compare Quotes" },
      { type: "p", text: "Collect 2–3 quotes to ensure fair pricing." }
    ],
    metaDescription: "Looking for a handyman in Loulé or Faro? Taskorilla connects you with reliable, verified local professionals, making it easy to get household jobs done.",
    ogImageUpload: "/images/blog/og/handyman-services-loule.jpg",
    cta: "Find verified handymen in Loulé on Taskorilla",
  },

  {
    title: "Carpentry Services in Carvoeiro: How to Choose",
    category: "Home Improvement",
    snippet: "Looking for carpentry services in Carvoeiro? Follow these tips to choose a skilled and verified professional...",
    date: "2026-01-16",
    location: "Carvoeiro",
    slug: "carpentry-services-carvoeiro",
    content: [
      { type: "h2", text: "Check Experience and Portfolio" },
      { type: "p", text: "Ask carpenters to show past work to ensure quality." },
      { type: "h2", text: "Read Reviews" },
      { type: "p", text: "Use Taskorilla reviews to verify reliability and client satisfaction." },
      { type: "h2", text: "Agree on Terms" },
      { type: "p", text: "Set clear terms for scope, materials, and pricing before starting work." }
    ],
    metaDescription: "Need carpentry services in Carvoeiro? Taskorilla helps you find verified local carpenters, making it easy to hire skilled professionals you can trust.",
    ogImageUpload: "/images/blog/og/carpentry-services-carvoeiro.jpg",
    cta: "Find verified carpenters in Carvoeiro on Taskorilla",
  },

  {
    title: "Cleaning services in Portimão made easy. Learn how to choose the right cleaner and connect with reliable, verified local professionals on Taskorilla.",
    category: "Cleaning",
    snippet: "Finding a cleaning service in Portimão doesn't have to be stressful. Here's how to pick the right one...",
    date: "2026-01-16",
    location: "Portimão",
    slug: "cleaning-services-portimao-how-to-choose",
    content: [
      { type: "h2", text: "Ask for Recommendations" },
      { type: "p", text: "Ask friends or neighbours for trusted cleaning services in Portimão." },
      { type: "h2", text: "Check Reviews" },
      { type: "p", text: "Look at verified reviews on Taskorilla to see past client experiences." },
      { type: "h2", text: "Compare Prices" },
      { type: "p", text: "Get a few quotes to compare pricing and services included." },
      { type: "h2", text: "Schedule and Confirm" },
      { type: "p", text: "Set a date and confirm all details in writing to avoid miscommunication." }
    ],
    metaDescription: "Cleaning services in Portimão made easy. Learn how to choose the right cleaner and connect with reliable, verified local professionals on Taskorilla everyday!",
    ogImageUpload: "/images/blog/og/cleaning-services-portimao-how-to-choose.jpg",
    cta: "Find professional cleaners in Portimão on Taskorilla",
  },

  {
    title: "Finding a Professional Cleaner in Olhão",
    category: "Cleaning",
    snippet: "Need a cleaner in Olhão? Here's how to find a professional, reliable, and trusted local service...",
    date: "2026-01-16",
    location: "Olhão",
    slug: "finding-professional-cleaner-olhao",
    content: [
      { type: "h2", text: "Ask Around" },
      { type: "p", text: "Get recommendations from friends and neighbors for trusted cleaners." },
      { type: "h2", text: "Check Reviews" },
      { type: "p", text: "Look at verified reviews on Taskorilla for each cleaner." },
      { type: "h2", text: "Confirm Services and Prices" },
      { type: "p", text: "Make sure the services offered match your needs and agree on pricing in advance." }
    ],
    metaDescription: "Looking for professional cleaners in Olhão? Taskorilla connects you with reliable local established cleaning services making it easy to hire help you can trust.",
    ogImageUpload: "/images/blog/og/finding-professional-cleaner-olhao.jpg",
    cta: "Find professional cleaners in Olhão on Taskorilla",
  },

  {
    title: "Finding a Good Painter in Tavira",
    category: "Home Improvement",
    snippet: "Hiring a painter in Tavira? Here's how to find a skilled and reliable professional quickly...",
    date: "2026-01-16",
    location: "Tavira",
    slug: "finding-a-good-painter-tavira",
    content: [
      { type: "h2", text: "Check Portfolios" },
      { type: "p", text: "Ask for past work samples or photos to gauge quality." },
      { type: "h2", text: "Read Reviews" },
      { type: "p", text: "Check Taskorilla for verified client reviews." },
      { type: "h2", text: "Compare Quotes" },
      { type: "p", text: "Get multiple quotes to find the best balance of price and quality." }
    ],
    metaDescription: "Looking for a reliable painter in Tavira or close by? Taskorilla helps you connect with verified local painting professionals you can trust for quality results.",
    ogImageUpload: "/images/blog/og/finding-a-good-painter-tavira.jpg",
    cta: "Find verified painters in Tavira on Taskorilla",
  },

  {
    title: "Top Services in the Algarve",
    category: "Local Services",
    snippet: "Explore the most popular services requested on Taskorilla in the Algarve region. From home repairs to professional services, see what tasks are in high demand.",
    date: "2025-01-05",
    location: "Algarve",
    slug: "top-services-in-the-algarve",
    content: [
      { type: "h2", text: "Local" },
      { type: "p", text: "Top Services in the Algarve" },
      { type: "h2", text: "Popular Services" },
      { type: "p", text: "Explore the most popular services requested on Taskorilla in the Algarve region. From home repairs to professional services, see what tasks are in high demand." },
      { type: "h2", text: "Range of Services" },
      { type: "p", text: "1. Plumbing Services\nFrom fixing leaks to installing new fixtures, plumbing is one of the most requested services.\n\n2. Electrical Work\nNeed electrical repairs or installations? Our verified electricians are ready to help.\n\n3. Home Maintenance\nRegular home maintenance keeps your property in top condition.\n\n4. Gardening and Landscaping\nBeautiful gardens require regular care and attention.\n\n5. Cleaning Services\nProfessional cleaning services for homes and businesses." },
      { type: "h2", text: "Trusted" },
      { type: "p", text: "Find trusted helpers for all these services and more on Taskorilla!" }
    ],
    metaDescription: "Explore the most popular services requested on Taskorilla in the Algarve region. From home repairs to professional services, see what tasks are in high demand.",
    ogImageUpload: "/images/blog/og/top-services-in-the-algarve.jpg",
  },

  {
    title: "Building Trust in the Community",
    category: "Home Maintenance",
    snippet: "Learn how Taskorilla builds trust through verified profiles, ratings, and reviews. Discover how our community ensures quality service for everyone.",
    date: "2024-12-28",
    location: "Faro",
    slug: "building-trust-in-the-community",
    content: [
      { type: "h2", text: "Building Trust in the Community" },
      { type: "p", text: "Verified profiles, ratings, and reviews. Discover how our community ensures quality service for everyone." },
      { type: "h2", text: "Verified Profiles" },
      { type: "p", text: "All helpers on Taskorilla have verified profiles with real information and credentials." },
      { type: "h2", text: "Rating System" },
      { type: "p", text: "After each completed task, both taskers and helpers can leave ratings and reviews." },
      { type: "h2", text: "Transparent Communication" },
      { type: "p", text: "Our messaging system allows direct communication between taskers and helpers." },
      { type: "h2", text: "Secure Payments" },
      { type: "p", text: "All payments are processed securely through our platform." },
      { type: "h2", text: "Community Guidelines" },
      { type: "p", text: "We maintain high standards through clear community guidelines and support." }
    ],
    metaDescription: "Learn how Taskorilla builds trust through verified profiles, ratings, reviews and more. Discover how our community ensures quality service for everyone.",
    ogImageUpload: "/images/blog/og/building-trust-in-the-community.jpg",
    cta: "Join our trusted community today!",
  },

  {
    title: "Hiring a Gardener in Silves: A Quick Guide",
    category: "Gardening",
    snippet: "Looking for a gardener in Silves? Here's a quick guide to finding someone skilled and reliable...",
    date: "2026-01-16",
    location: "Silves",
    slug: "hiring-a-gardener-silves",
    content: [
      { type: "h2", text: "Ask for Local Recommendations" },
      { type: "p", text: "Neighbors and friends are often the best source for trustworthy gardeners." },
      { type: "h2", text: "Check Reviews Online" },
      { type: "p", text: "Use Taskorilla to verify ratings and past client feedback." },
      { type: "h2", text: "Confirm Services and Pricing" },
      { type: "p", text: "Make sure the gardener provides the services you need and agree on pricing upfront." }
    ],
    metaDescription: "Need a gardener in Silves, Albufeira or near you? Taskorilla connects you with verified professionals to keep your garden perfect evey day of the year.",
    ogImageUpload: "/images/blog/og/hiring-a-gardener-silves.jpg",
    cta: "Find verified gardeners in Silves on Taskorilla",
  },

  {
    title: "Home Maintenance Tips for Albufeira Residents",
    category: "Home Maintenance",
    snippet: "Keep your home in Albufeira in perfect condition with these simple maintenance tips and trusted professionals...",
    date: "2026-01-16",
    location: "Albufeira",
    slug: "home-maintenance-tips-albufeira",
    content: [
      { type: "h2", text: "Regular Inspections" },
      { type: "p", text: "Check plumbing, electrical, and roofing regularly to catch small issues early." },
      { type: "h2", text: "Hire Verified Professionals" },
      { type: "p", text: "Use Taskorilla to connect with verified local professionals for maintenance tasks." },
      { type: "h2", text: "Preventive Cleaning" },
      { type: "p", text: "Schedule regular cleaning to avoid long-term damage to floors, tiles, and furniture." }
    ],
    metaDescription: "Albufeira homeowners can use these tips to keep their properties in top shape. Taskorilla connects you with many local pros who know what they're doing!",
    ogImageUpload: "/images/blog/og/home-maintenance-tips-albufeira.jpg",
    cta: "Hire maintenance professionals in Albufeira on Taskorilla",
  },

  {
    title: "How to Post Your First Task",
    category: "Getting Started",
    snippet: "New to Taskorilla? Learn how to post your first task in just a few simple steps. From describing your needs to selecting the right helper, we guide you through the process.",
    date: "2025-01-10",
    location: "Algarve",
    slug: "how-to-post-your-first-task",
    content: [
      { type: "h2", text: "How to Post Your First Task" },
      { type: "p", text: "Learn how to post your first task in just a few simple steps. From describing your needs to selecting the right helper, we guide you through the process." },
      { type: "h2", text: "Step 1: Create an Account" },
      { type: "p", text: "Sign up for free and create your Taskorilla account. It only takes a minute!" },
      { type: "h2", text: "Step 2: Describe Your Task" },
      { type: "p", text: "Be specific about what you need. Include details like location, timeline, and any special requirements." },
      { type: "h2", text: "Step 3: Set Your Budget" },
      { type: "p", text: "Decide on a budget or choose to receive quotes from helpers or just as for a Quote." },
      { type: "h2", text: "Step 4: Review Bids" },
      { type: "p", text: "Helpers will submit bids for your task. Review their profiles, ratings, and previous work." },
      { type: "h2", text: "Step 5: Select and Complete" },
      { type: "p", text: "Choose the best helper for your task and communicate directly through our platform." }
    ],
    metaDescription: "Learn how to post your first task in just a few simple steps. From describing your needs to selecting the right helper, we guide you through the process.",
    ogImageUpload: "/images/blog/og/how-to-post-your-first-task.jpg",
  }
]// Helper function to get all unique categories
export function getAllCategories(): string[] {
  const categories = new Set<string>()
  blogs.forEach(blog => {
    if (blog.category) {
      categories.add(blog.category)
    }
  })
  return Array.from(categories).sort()
}

// Helper function to get all unique locations
export function getAllLocations(): string[] {
  const locations = new Set<string>()
  blogs.forEach(blog => {
    if (blog.location) {
      locations.add(blog.location)
    }
  })
  return Array.from(locations).sort()
}

// Helper function to get blog post by slug
export function getBlogBySlug(slug: string): BlogPost | undefined {
  return blogs.find(blog => blog.slug === slug)
}

// Helper function to get related blog posts (by category or location, excluding current post)
export function getRelatedPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const currentPost = getBlogBySlug(currentSlug)
  if (!currentPost) return []

  // Find posts with same category or location, excluding current post
  const related = blogs
    .filter(blog => 
      blog.slug !== currentSlug && 
      (blog.category === currentPost.category || blog.location === currentPost.location)
    )
    .sort((a, b) => {
      // Prioritize posts with both category and location match
      const aMatches = (a.category === currentPost.category ? 1 : 0) + (a.location === currentPost.location ? 1 : 0)
      const bMatches = (b.category === currentPost.category ? 1 : 0) + (b.location === currentPost.location ? 1 : 0)
      if (bMatches !== aMatches) return bMatches - aMatches
      // Then sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
    .slice(0, limit)

  // If not enough related posts, fill with other recent posts
  if (related.length < limit) {
    const additional = blogs
      .filter(blog => blog.slug !== currentSlug && !related.find(r => r.slug === blog.slug))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit - related.length)
    related.push(...additional)
  }

  return related
}