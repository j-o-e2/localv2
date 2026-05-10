import type { Metadata } from "next"

type Params = {
  category: string
}

const categoryData: Record<string, { title: string; description: string; keywords: string[]; icon: string }> = {
  plumbing: {
    title: "Plumbing Services in Kenya | Hire Plumbers Near You",
    description: "Looking for professional plumbers in Kenya? Find and hire trusted plumbing experts near you on LocalFix Kenya.",
    keywords: [
      "plumbing services Kenya",
      "plumbers in Kenya",
      "pipe repair Kenya",
      "water leak repair",
      "bathroom installation",
      "emergency plumbing",
      "professional plumbers",
      "hire plumber online",
    ],
    icon: "🔧",
  },
  electrical: {
    title: "Electrical Services in Kenya | Hire Electricians Near You",
    description: "Looking for professional electricians in Kenya? Find and hire trusted electrical experts near you on LocalFix Kenya.",
    keywords: [
      "electrical services Kenya",
      "electricians in Kenya",
      "electrical repairs",
      "wiring services",
      "electrical installation",
      "emergency electrician",
      "professional electricians",
      "hire electrician online",
    ],
    icon: "⚡",
  },
  cleaning: {
    title: "Cleaning Services in Kenya | Hire Cleaners Near You",
    description: "Looking for professional cleaning services in Kenya? Find and hire trusted cleaners near you on LocalFix Kenya.",
    keywords: [
      "cleaning services Kenya",
      "cleaners in Kenya",
      "house cleaning",
      "office cleaning",
      "professional cleaners",
      "cleaning service near me",
      "domestic cleaning",
      "hire cleaner online",
    ],
    icon: "🧹",
  },
  masonry: {
    title: "Masonry Services in Kenya | Hire Masons Near You",
    description: "Looking for professional masonry services in Kenya? Find and hire trusted masons near you on LocalFix Kenya.",
    keywords: [
      "masonry services Kenya",
      "masons in Kenya",
      "brick laying",
      "wall construction",
      "concrete work",
      "masonry repair",
      "professional masons",
      "hire mason online",
    ],
    icon: "🧱",
  },
  maid: {
    title: "Domestic Help (Maid) Services in Kenya | Hire Maids Near You",
    description: "Looking for reliable domestic help (maid/mamafua) services in Kenya? Find and hire trusted professionals near you on LocalFix Kenya.",
    keywords: [
      "maid services Kenya",
      "domestic help Kenya",
      "mamafua Kenya",
      "house help services",
      "domestic workers",
      "maid near me",
      "reliable domestic help",
      "hire maid online",
    ],
    icon: "👩‍🍳",
  },
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const data = categoryData[params.category.toLowerCase()] || categoryData.plumbing
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    openGraph: {
      title: data.title,
      description: data.description,
      type: "website",
      url: `${SITE_URL}/services/category/${params.category}`,
      siteName: "LocalFix Kenya",
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
    },
    alternates: {
      canonical: `${SITE_URL}/services/category/${params.category}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
