import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get("jobId")

    let query = supabase.from("job_applications").select("*")

    if (jobId) {
      query = query.eq("job_id", jobId)
    } else {
      query = query.eq("provider_id", user.id)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching job_applications:", error)
    return NextResponse.json({ error: "Failed to fetch job_applications" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[job-app-POST] Starting job application submission")
    
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
              // Ignore cookie setter errors in edge runtime.
            }
          },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user?.id) {
      console.error("[job-app-POST] Auth error or no user:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[job-app-POST] User authenticated:", user.id)

    const body = await request.json()
    const jobId = String(body?.jobId || "").trim()
    const coverLetter = String(body?.coverLetter || "").trim()
    const proposedRate = Number(body?.proposedRate)

    console.log("[job-app-POST] Request body parsed:", { jobId, coverLetter: coverLetter.slice(0, 50) + "...", proposedRate })

    if (!jobId || !coverLetter || Number.isNaN(proposedRate)) {
      console.error("[job-app-POST] Validation failed:", { jobId: !!jobId, coverLetter: !!coverLetter, proposedRate: !Number.isNaN(proposedRate) })
      return NextResponse.json(
        { error: "Missing or invalid jobId, coverLetter, or proposedRate." },
        { status: 400 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[job-app-POST] Missing Supabase configuration")
      return NextResponse.json({ error: "Supabase service role key not configured." }, { status: 500 })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    console.log("[job-app-POST] Checking if job exists:", jobId)
    const { data: job, error: jobError } = await serviceClient
      .from("jobs")
      .select("id")
      .eq("id", jobId)
      .single()

    if (jobError || !job) {
      console.error("[job-app-POST] Job not found:", jobError)
      return NextResponse.json({ error: "Job not found." }, { status: 404 })
    }

    console.log("[job-app-POST] Job found, inserting application")

    const { data, error } = await serviceClient
      .from("job_applications")
      .insert([
        {
          job_id: jobId,
          provider_id: user.id,
          cover_letter: coverLetter,
          proposed_rate: proposedRate,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[job-app-POST] Insert error:", error)
      console.error("[job-app-POST] Error message:", error?.message)
      console.error("[job-app-POST] Error code:", error?.code)
      console.error("[job-app-POST] Error details:", error?.details)
      
      const errorMsg = String(error?.message || error?.details || "").toLowerCase()
      const isTriggerFailure =
        errorMsg.includes('record "new" has no field') ||
        errorMsg.includes("record 'new' has no field") ||
        errorMsg.includes("notification trigger")

      if (isTriggerFailure) {
        console.error("[job-app-POST] Trigger-related failure detected.", error)
        
        const { data: existingApplication, error: existingAppError } = await serviceClient
          .from("job_applications")
          .select("*")
          .eq("job_id", jobId)
          .eq("provider_id", user.id)
          .maybeSingle()

        if (existingAppError) {
          console.warn("[job-app-POST] Could not verify application existence:", existingAppError)
        }

        if (existingApplication) {
          return NextResponse.json(existingApplication)
        } else {
          // Trigger failure prevented submission
          return NextResponse.json(
            {
              error: "The job application service is temporarily unavailable because the notification pipeline failed. Please try again later or contact support if this continues.",
              retryable: true,
            },
            { status: 500 },
          )
        }
      }

      console.error("[job-app-POST] Returning error response:", error?.message)
      return NextResponse.json(
        { error: error?.message || "Failed to create job application.", code: error?.code, details: error?.details, hint: error?.hint },
        { status: 500 },
      )
    }

    console.log("[job-app-POST] Application inserted successfully:", data?.id)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("[job-app-POST] Catch block error:", error)
    console.error("[job-app-POST] Error message:", error?.message)
    console.error("[job-app-POST] Error stack:", error?.stack)
    return NextResponse.json(
      { error: error?.message || "Failed to create job application." },
      { status: 500 },
    )
  }
}
