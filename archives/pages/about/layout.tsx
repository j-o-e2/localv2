import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About LocalFix Kenya | Our Mission & Vision",
  description:
    "Learn about LocalFix Kenya - the platform connecting clients with trusted local service providers. Our mission is to make quality services accessible to everyone in Kenya.",
  keywords: [
    "about LocalFix Kenya",
    "local services platform Kenya",
    "service provider network",
    "LocalFix mission",
    "Kenya service marketplace",
    "community services",
  ],
  openGraph: {
    title: "About LocalFix Kenya | Our Mission & Vision",
    description:
      "Discover how LocalFix Kenya is revolutionizing local services across the country.",
    type: "website",
    url: "/about",
    siteName: "LocalFix Kenya",
    images: [
      {
        url: "/og/about-hero.png",
        width: 1200,
        height: 630,
        alt: "About LocalFix Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About LocalFix Kenya | Our Mission & Vision",
    description:
      "Discover how LocalFix Kenya is revolutionizing local services across the country.",
    images: ["/og/about-hero.png"],
  },
  alternates: {
    canonical: "https://localfixkenya.com/about",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
