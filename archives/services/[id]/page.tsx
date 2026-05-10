import type { Metadata } from "next"
import ServiceDetailClient from "./ServiceDetailClient"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

export function generateMetadata({ params }: { params: Promise<{ id: string }> }): Metadata {
  const title = `Service details | LocalFix Kenya`
  const description = `View the LocalFix Kenya service details page. Book trusted local professionals and read full provider information.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/services`,
      siteName: "LocalFix Kenya",
    },
    twitter: {
      title,
      description,
    },
  }
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return <ServiceDetailClient serviceId={resolvedParams.id} />
}
