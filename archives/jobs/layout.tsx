import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Latest Jobs in Kenya | Apply Now | LocalFix Kenya",
  description:
    "Browse the latest job opportunities in Kenya. Apply for jobs near you or post a job today on LocalFix Kenya.",
  keywords: [
    "jobs in Kenya",
    "latest jobs Kenya",
    "employment Kenya",
    "job listings Kenya",
    "apply for jobs Kenya",
    "cleaning jobs Kenya",
    "delivery jobs Kenya",
    "repair jobs Kenya",
    "construction jobs Kenya",
    "part-time jobs Kenya",
    "gig work Kenya",
    "local employment Kenya",
    "Nairobi jobs",
    "Mombasa jobs",
  ],
  openGraph: {
    title: "Latest Jobs in Kenya | Apply Now | LocalFix Kenya",
    description:
      "Browse the latest job opportunities in Kenya. Apply for jobs near you or post a job today on LocalFix Kenya.",
    type: "website",
    url: "/jobs",
    siteName: "LocalFix Kenya",
    images: [
      {
        url: "/og/jobs-hero.png",
        width: 1200,
        height: 630,
        alt: "Latest jobs on LocalFix Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Latest Jobs in Kenya | Apply Now | LocalFix Kenya",
    description:
      "Browse the latest job opportunities in Kenya. Apply for jobs near you or post a job today on LocalFix Kenya.",
    images: ["/og/jobs-hero.png"],
  },
  alternates: {
    canonical: "https://localfixkenya.com/jobs",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
