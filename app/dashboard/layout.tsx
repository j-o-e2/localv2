import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative w-full min-h-screen">
      <div className="relative z-10 w-full min-h-screen bg-transparent text-white">
        {children}
      </div>
    </div>
  )
}