import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const siteDescription =
  "Looking for jobs or reliable service providers in Kenya? LocalFix Kenya connects you with skilled professionals near you. Post a job or get hired today."

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Find Trusted Local Service Providers & Jobs in Kenya | LocalFix Kenya",
    template: "%s | LocalFix Kenya",
  },
  description: siteDescription,
  keywords: [
    "LocalFix Kenya",
    "jobs in Kenya",
    "local services Kenya",
    "Nairobi service providers",
    "Mombasa local jobs",
    "hire local contractors",
    "plumbing services Kenya",
    "electrical repair services",
    "cleaning services Kenya",
    "moving and delivery services",
    "handyman services Kenya",
    "find work in Kenya",
    "post a job Kenya",
    "trusted professionals Kenya",
  ],
  authors: [{ name: "LocalFix Kenya", url: "https://localfixkenya.com" }],
  generator: "v0.app",
  icons: {
    icon: "/logo/localfixkenyalogo.png",
    shortcut: "/logo/localfixkenyalogo.png",
    apple: "/logo/localfixkenyalogo.png",
  },
  openGraph: {
    title: "LocalFix Kenya - Connect with Local Service Providers",
    description: siteDescription,
    type: "website",
    url: "/",
    siteName: "LocalFix Kenya",
    images: [
      {
        url: "/logo/localfixkenyalogo.png",
        width: 1200,
        height: 630,
        alt: "LocalFix Kenya logo",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "LocalFix Kenya - Connect with Local Service Providers",
    description: siteDescription,
    images: ["/logo/localfixkenyalogo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
