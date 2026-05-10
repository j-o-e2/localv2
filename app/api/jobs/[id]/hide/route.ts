import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

// Helper function to get user from cookies or Authorization header
async function getAuthenticatedUser(request: NextRequest, cookieStore: any, supabase: any) {
  // Try to get user from cookies first
  const { data: { user } = {} as any, error: cookieError } = await supabase.auth.getUser()

  if (user) {
    console.log("[getAuthenticatedUser] User found from cookies:", user.id)
    return user
  }

  if (cookieError) {
    console.warn("[getAuthenticatedUser] Cookie auth check failed:", cookieError)
  }

  // Try to get from Authorization header if cookies failed
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[getAuthenticatedUser] No authorization header found")
    return null
  }

  const token = authHeader.slice(7)
  console.log("[getAuthenticatedUser] Found Bearer token in header")

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) {
    console.error("[getAuthenticatedUser] SERVICE_ROLE_KEY or SUPABASE URL not configured")
    return null
  }

  try {
    const tokenClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: { persistSession: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    const { data: { user: tokenUser } = {} as any, error: tokenError } = await tokenClient.auth.getUser()
    if (tokenError || !tokenUser) {
      console.error("[getAuthenticatedUser] Bearer token verification failed:", tokenError)
      return null
    }

    console.log("[getAuthenticatedUser] User verified from token:", tokenUser.id)
    return tokenUser
  } catch (err) {
    console.error("[getAuthenticatedUser] Error verifying token:", err)
    return null
  }
}

export async function POST(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const jobId = params?.id

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      },
    )

    // Get authenticated user
    const user = await getAuthenticatedUser(request, cookieStore, supabase)

    if (!user) {
      console.log("[POST /api/jobs/[id]/hide] Authorization failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[POST /api/jobs/[id]/hide] User authenticated:", user.id)

    // Use service role to bypass RLS for inserting into user_hidden_jobs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Check if already hidden
    const { data: existing, error: checkError } = await svc
      .from("user_hidden_jobs")
      .select("id")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle()

    if (checkError) {
      console.error("[POST /api/jobs/[id]/hide] Error checking existing hidden job:", checkError)
      return NextResponse.json({ error: "Failed to check hidden status" }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ message: "Job already hidden" }, { status: 200 })
    }

    // Hide the job
    const { data, error } = await svc
      .from("user_hidden_jobs")
      .insert({
        user_id: user.id,
        job_id: jobId
      })
      .select()
      .single()

    if (error) {
      console.error("[POST /api/jobs/[id]/hide] Error hiding job:", error)
      return NextResponse.json({ error: "Failed to hide job" }, { status: 500 })
    }

    console.log("[POST /api/jobs/[id]/hide] Job hidden successfully:", jobId, "for user:", user.id)
    return NextResponse.json({ success: true, message: "Job hidden successfully" })
  } catch (error) {
    console.error("[POST /api/jobs/[id]/hide] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const jobId = params?.id

    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // Handle cookie setting errors
            }
          },
        },
      },
    )

    // Get authenticated user
    const user = await getAuthenticatedUser(request, cookieStore, supabase)

    if (!user) {
      console.log("[DELETE /api/jobs/[id]/hide] Authorization failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[DELETE /api/jobs/[id]/hide] User authenticated:", user.id)

    // Use service role to bypass RLS for deleting from user_hidden_jobs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    // Unhide the job
    const { data, error } = await svc
      .from("user_hidden_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .select()

    if (error) {
      console.error("[DELETE /api/jobs/[id]/hide] Error unhiding job:", error)
      return NextResponse.json({ error: "Failed to unhide job" }, { status: 500 })
    }

    console.log("[DELETE /api/jobs/[id]/hide] Job unhidden successfully:", jobId, "for user:", user.id)
    return NextResponse.json({ success: true, message: "Job unhidden successfully" })
  } catch (error) {
    console.error("[DELETE /api/jobs/[id]/hide] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}