import { NextResponse } from "next/server"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const HOST = SITE_URL.replace(/\/+$/, "")
const LAST_MODIFIED = new Date().toISOString().split("T")[0]

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/locations",
  "/jobs",
  "/services",
  "/contact",
  "/signup",
  "/login",
  "/terms",
]

const LOCATION_ROUTES = [
  "/locations/nairobi",
  "/locations/mombasa",
  "/locations/kisumu",
  "/locations/eldoret",
  "/locations/meru",
  "/locations/nakuru",
  "/locations/nyeri",
]

const SERVICE_CATEGORY_ROUTES = [
  "/services/category/plumbing",
  "/services/category/electrical",
  "/services/category/cleaning",
  "/services/category/masonry",
  "/services/category/maid",
]

export function GET() {
  const allRoutes = [...PUBLIC_ROUTES, ...LOCATION_ROUTES, ...SERVICE_CATEGORY_ROUTES]

  // Create XML with different priorities for different page types
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map((route) => {
  let priority = "0.8"
  let changefreq = "weekly"

  // Higher priority for main pages
  if (route === "/") {
    priority = "1.0"
    changefreq = "daily"
  } else if (["/jobs", "/services", "/about"].includes(route)) {
    priority = "0.9"
    changefreq = "daily"
  } else if (route.startsWith("/locations/")) {
    priority = "0.7"
    changefreq = "weekly"
  } else if (route.startsWith("/services/category/")) {
    priority = "0.6"
    changefreq = "weekly"
  }

  return `  <url>
    <loc>${HOST}${route}</loc>
    <lastmod>${LAST_MODIFIED}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}).join("\n")}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml;charset=UTF-8",
    },
  })
}
