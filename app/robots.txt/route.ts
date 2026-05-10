import { NextResponse } from "next/server"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const SITEMAP_URL = `${SITE_URL.replace(/\/+$/, "")}/sitemap.xml`

export function GET() {
  const content = `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /api\nDisallow: /auth\nSitemap: ${SITEMAP_URL}\n`

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
  })
}
