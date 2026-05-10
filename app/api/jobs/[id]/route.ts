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

export async function GET(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).limit(1).maybeSingle()

  if (error) throw error

  return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching job:", error)
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

    // Get user from cookies or Authorization header
    const user = await getAuthenticatedUser(request, cookieStore, supabase)

    if (!user) {
      console.log("[PATCH] Authorization failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[PATCH] User authenticated:", user.id)

    const body = await request.json()

    // Verify job ownership - check client_id
    const { data: job, error: fetchError } = await supabase
      .from("jobs")
      .select("client_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) {
      console.error("[PATCH] Error fetching job for", id, fetchError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!job) {
      console.error("[PATCH] Job not found:", id)
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    if (job.client_id !== user.id) {
      console.error("[PATCH] User", user.id, "does not own job", id, "(client_id:", job.client_id, ")")
      return NextResponse.json({ error: "Unauthorized - you do not own this job" }, { status: 403 })
    }

    console.log("[PATCH] Ownership verified for user", user.id, "on job", id)

    // Normalize budget_type to proper values if provided
    const updateData: Record<string, any> = { ...body, updated_at: new Date().toISOString() }
    if (updateData.budget_type) {
      const bt = String(updateData.budget_type).toLowerCase().trim()
      if (bt.includes('hourly') || bt.includes('hour')) {
        updateData.budget_type = 'hourly rate'
      } else if (bt.includes('fixed') || bt.includes('fix')) {
        updateData.budget_type = 'fixed price'
      }
      // If it's already in the correct format, keep it as-is
    }

    console.log("[PATCH] Updating job with data:", updateData)

    const { data, error } = await supabase
      .from("jobs")
      .update(updateData)
      .eq("id", id)
      .select()
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[PATCH] Update error:", error)
      throw error
    }

    console.log("[PATCH] Update successful")
    return NextResponse.json(data)
  } catch (error) {
    console.error("[PATCH] Error updating job:", error)
    return NextResponse.json({ error: "Failed to update job", details: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
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

    // Get user from cookies or Authorization header
    const user = await getAuthenticatedUser(request, cookieStore, supabase)

    if (!user) {
      console.log("[DELETE] Authorization failed - no user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[DELETE] User authenticated:", user.id)

    // Verify job ownership (defensive) - check both poster_id and client_id
    let jobQuery = supabase.from("jobs").select("client_id").eq("id", id).limit(1).maybeSingle()
    
    // Try to include poster_id if it exists
    try {
      const testQuery = await supabase.from("jobs").select("poster_id").limit(1)
      if (!testQuery.error) {
        jobQuery = supabase.from("jobs").select("client_id, poster_id").eq("id", id).limit(1).maybeSingle()
      }
    } catch (e) {
      // poster_id column doesn't exist, continue with client_id only
    }

    const { data: job, error: fetchError } = await jobQuery

    if (fetchError) {
      console.error("[DELETE] Error fetching job for ownership verification", id, fetchError)
      return NextResponse.json({ error: "Failed to verify job ownership", details: String(fetchError) }, { status: 500 })
    }

    if (!job) {
      console.error("[DELETE] Job not found:", id)
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const { data: jobOwnerRow, error: ownershipError } = await svc
      .from("jobs")
      .select("client_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (ownershipError) {
      console.error('[DELETE] ownership lookup error:', ownershipError)
      return NextResponse.json({ error: "Failed to verify job ownership", details: String(ownershipError) }, { status: 500 })
    }

    if (!jobOwnerRow) {
      console.error('[DELETE] Job not found for ownership lookup:', id)
      return NextResponse.json({ error: 'Job not found', status: 404 }, { status: 404 })
    }

    if (jobOwnerRow.client_id !== user.id) {
      console.error('[DELETE] User', user.id, 'does not own job', id, '(client_id:', jobOwnerRow.client_id, ')')
      return NextResponse.json({ error: 'Forbidden: you are not the owner of this job' }, { status: 403 })
    }

    console.log("[DELETE] Ownership verified for user", user.id, "on job", id)

    // Soft-archive the job instead of hard-deleting it
    const { data: archivedJob, error: archiveError } = await svc
      .from("jobs")
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle()

    let resultData = archivedJob

    if (archiveError) {
      const errMsg = String(archiveError.message || archiveError).toLowerCase()
      if (
        errMsg.includes('column "archived" does not exist') ||
        errMsg.includes('invalid column reference') ||
        errMsg.includes('column archived does not exist')
      ) {
        console.warn('[DELETE] archived column missing on jobs, deleting row instead:', errMsg)
        const { data: deleteData, error: deleteError } = await svc
          .from("jobs")
          .delete()
          .eq("id", id)
          .select()
          .maybeSingle()

        if (deleteError) {
          console.error('[DELETE] fallback delete error:', deleteError)
          return NextResponse.json(
            { error: 'Failed to delete job', details: deleteError?.message ?? String(deleteError) },
            { status: 500 }
          )
        }

        resultData = deleteData
      } else {
        console.error('[DELETE] archive error:', archiveError)
        return NextResponse.json(
          { error: 'Failed to archive job', details: archiveError?.message ?? String(archiveError) },
          { status: 500 }
        )
      }
    }

    if (!resultData) {
      console.error('[DELETE] Job delete/archive returned no data for:', id)
      return NextResponse.json(
        { error: 'Job delete failed', details: 'No data returned from delete/archive' },
        { status: 500 }
      )
    }

    console.log("[DELETE] Job deleted/archived successfully for:", id)
    return NextResponse.json({ success: true, archived: resultData, message: 'Job deleted successfully' })
  } catch (error) {
    console.error("[DELETE] Error deleting job:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to delete job', details: errorMessage },
      { status: 500 }
    )
  }
}
