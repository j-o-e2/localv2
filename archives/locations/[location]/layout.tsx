import type { Metadata } from "next"

type Params = {
  location: string
}

const locationData: Record<string, { title: string; description: string; keywords: string[] }> = {
  nairobi: {
    title: "Jobs & Local Services in Nairobi | LocalFix Kenya",
    description: "Find jobs and hire professionals in Nairobi. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Nairobi",
      "Nairobi jobs",
      "plumbing services Nairobi",
      "electrical repair Nairobi",
      "cleaning services Nairobi",
      "hire professionals Nairobi",
      "local services Nairobi",
      "handyman Nairobi",
      "electricians in Nairobi",
      "plumbers in Nairobi",
    ],
  },
  mombasa: {
    title: "Jobs & Local Services in Mombasa | LocalFix Kenya",
    description: "Find jobs and hire professionals in Mombasa. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Mombasa",
      "Mombasa jobs",
      "plumbing services Mombasa",
      "electrical repair Mombasa",
      "cleaning services Mombasa",
      "hire professionals Mombasa",
      "local services Mombasa",
      "handyman Mombasa",
    ],
  },
  kisumu: {
    title: "Jobs & Local Services in Kisumu | LocalFix Kenya",
    description: "Find jobs and hire professionals in Kisumu. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Kisumu",
      "Kisumu jobs",
      "plumbing services Kisumu",
      "electrical repair Kisumu",
      "cleaning services Kisumu",
      "hire professionals Kisumu",
      "local services Kisumu",
      "handyman Kisumu",
    ],
  },
  eldoret: {
    title: "Jobs & Local Services in Eldoret | LocalFix Kenya",
    description: "Find jobs and hire professionals in Eldoret. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Eldoret",
      "Eldoret jobs",
      "plumbing services Eldoret",
      "electrical repair Eldoret",
      "cleaning services Eldoret",
      "hire professionals Eldoret",
      "local services Eldoret",
      "handyman Eldoret",
    ],
  },
  meru: {
    title: "Jobs & Local Services in Meru | LocalFix Kenya",
    description: "Find jobs and hire professionals in Meru. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Meru",
      "Meru jobs",
      "plumbing services Meru",
      "electrical repair Meru",
      "cleaning services Meru",
      "hire professionals Meru",
      "local services Meru",
      "handyman Meru",
    ],
  },
  nakuru: {
    title: "Jobs & Local Services in Nakuru | LocalFix Kenya",
    description: "Find jobs and hire professionals in Nakuru. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Nakuru",
      "Nakuru jobs",
      "plumbing services Nakuru",
      "electrical repair Nakuru",
      "cleaning services Nakuru",
      "hire professionals Nakuru",
      "local services Nakuru",
      "handyman Nakuru",
    ],
  },
  nyeri: {
    title: "Jobs & Local Services in Nyeri | LocalFix Kenya",
    description: "Find jobs and hire professionals in Nyeri. Browse local services or post a job today on LocalFix Kenya.",
    keywords: [
      "jobs in Nyeri",
      "Nyeri jobs",
      "plumbing services Nyeri",
      "electrical repair Nyeri",
      "cleaning services Nyeri",
      "hire professionals Nyeri",
      "local services Nyeri",
      "handyman Nyeri",
    ],
  },
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const data = locationData[params.location.toLowerCase()] || locationData.nairobi
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    openGraph: {
      title: data.title,
      description: data.description,
      type: "website",
      url: `${SITE_URL}/locations/${params.location}`,
      siteName: "LocalFix Kenya",
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
    },
    alternates: {
      canonical: `${SITE_URL}/locations/${params.location}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function LocationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
