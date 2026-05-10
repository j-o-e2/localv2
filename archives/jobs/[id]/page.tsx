import type { Metadata } from "next"
import JobDetailsClient from "./JobDetailsClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export function generateMetadata({ params }: { params: Promise<{ id: string }> }): Metadata {
  const title = `Job details | LocalFix Kenya`
  const description = `View the job listing on LocalFix Kenya. Browse details, apply, and connect with local service providers.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/jobs`,
      siteName: "LocalFix Kenya",
    },
    twitter: {
      title,
      description,
    },
  }
}

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return <JobDetailsClient jobId={resolvedParams.id} />
}
