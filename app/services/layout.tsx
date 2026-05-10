import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Local Services Directory in Kenya | LocalFix Kenya",
  description:
    "Browse professional services in Kenya. Find electricians, plumbers, cleaners, handymen, and more local service providers near you. Trusted, vetted professionals in Nairobi, Mombasa, Kisumu.",
  keywords: [
    "local services Kenya",
    "home services Kenya",
    "electrician Kenya",
    "plumber Kenya",
    "cleaning services Kenya",
    "handyman Kenya",
    "professional services Kenya",
    "trusted service providers",
    "Nairobi services",
    "Mombasa services",
    "contractor Kenya",
    "repair services Kenya",
  ],
  openGraph: {
    title: "Local Services Directory in Kenya | LocalFix Kenya",
    description:
      "Find trusted, vetted local service providers for any job. Book instantly with LocalFix Kenya.",
    type: "website",
    url: "/services",
    siteName: "LocalFix Kenya",
    images: [
      {
        url: "/og/services-hero.png",
        width: 1200,
        height: 630,
        alt: "Local services on LocalFix Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Services Directory in Kenya | LocalFix Kenya",
    description:
      "Find trusted, vetted local service providers for any job. Book instantly with LocalFix Kenya.",
    images: ["/og/services-hero.png"],
  },
  alternates: {
    canonical: "https://localfixkenya.com/services",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
