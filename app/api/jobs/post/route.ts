import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || "no-reply@localfixkenya.com"

async function sendEmailAlerts(recipients: string[], job: any, baseUrl: string) {
  if (recipients.length === 0) {
    return 0
  }

  const fullUrl = baseUrl || "https://localfixkenya.com"
  const htmlContent = `
          <p>Hello,</p>
          <p>A new job has been posted that may match your area:</p>
          <p><strong>${job.title}</strong></p>
          <p>${job.description}</p>
          <p><strong>Location:</strong> ${job.location}</p>
          <p><strong>Budget:</strong> ${job.budget} (${job.budget_type})</p>
          <p><a href="${fullUrl}/jobs/${job.id}">View this job on LocalFixKenya</a></p>
          <p>Thank you for helping your community stay connected.</p>
        `

  if (SENDGRID_API_KEY) {
    const message = {
      personalizations: recipients.map((email) => ({
        to: [{ email }],
        subject: `New LocalFixKenya job near you: ${job.title}`,
      })),
      from: { email: DEFAULT_FROM_EMAIL, name: "LocalFixKenya" },
      content: [
        {
          type: "text/html",
          value: htmlContent,
        },
      ],
    }

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`SendGrid error: ${response.status} ${body}`)
    }

    return recipients.length
  }

  if (RESEND_API_KEY) {
    const resend = new Resend(RESEND_API_KEY)

    const sendPromises = recipients.map((email) =>
      resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: email,
        subject: `New LocalFixKenya job near you: ${job.title}`,
        html: htmlContent,
      }),
    )

    const results = await Promise.allSettled(sendPromises)
    const successCount = results.filter((r) => r.status === "fulfilled").length
    const failures = results.filter((r) => r.status === "rejected")

    if (failures.length > 0) {
      console.warn("[job-alerts] Resend failed for some recipients:", failures)
    }

    return successCount
  }

  console.warn("[job-alerts] No email provider configured (SENDGRID_API_KEY or RESEND_API_KEY required). Skipping email delivery.")
  return 0
}

export async function POST(request: NextRequest) {
  console.log("API Route: Job post endpoint called")
  try {
    console.log("API Route: Starting job post request")
    console.log("SUPABASE_URL configured:", !!SUPABASE_URL)
    console.log("SUPABASE_ANON_KEY configured:", !!SUPABASE_ANON_KEY)

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("API Route: Supabase not configured")
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const { data: { user } = {} as any } = await supabase.auth.getUser()
    console.log("API Route: User from auth:", user ? { id: user.id, email: user.email } : "No user")

    if (!user?.id) {
      console.error("API Route: Authentication required - no user found")
      return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    }

    let payload: any = {}
    try {
      payload = await request.json()
      console.log("[job-post] Raw request body received:", request.body)
      const requestHeaders: Record<string, string> = {}
      request.headers.forEach((value, key) => {
        requestHeaders[key] = value
      })
      console.log("[job-post] Request headers:", requestHeaders)
    } catch (jsonError: any) {
      console.error("[job-post] JSON parsing error:", jsonError)
      console.error("[job-post] Raw request text:", await request.text())
      return NextResponse.json({ 
        error: "Invalid JSON in request body",
        jsonError: jsonError.message 
      }, { status: 400 })
    }

    const normalizeBudgetType = (input: any): 'fixed price' | 'hourly rate' => {
      if (input && typeof input === 'object') {
        if ('value' in input) input = input.value
        else if ('label' in input) input = input.label
        else input = ''
      }

      // Multi-level sanitization: trim, lowercase, remove all whitespace, keep only letters
      const raw = String(input || 'fixed')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '') // Remove all internal spaces
        .replace(/[^a-z]/g, '') // Keep only letters

      console.log('[normalizeBudgetType] Input:', input, '-> Raw:', raw)

      if (raw.includes('hourly') || raw.includes('hour')) return 'hourly rate'
      if (raw.includes('fixed') || raw.includes('fix')) return 'fixed price'
      
      // Fallback to fixed price if unclear
      console.warn('[normalizeBudgetType] Unclear value, defaulting to fixed price:', input)
      return 'fixed price'
    }

    console.log("[job-post] Raw payload received:", JSON.stringify(payload, null, 2))
    console.log("[job-post] Payload keys:", Object.keys(payload))
    console.log("[job-post] Payload types:", Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, typeof v])))

    // Extract and validate required fields
    const title = payload.title
    const description = payload.description
    const category = payload.category
    let required_skills = payload.required_skills
    const budget = payload.budget
    let budget_type = payload.budget_type
    const location = payload.location
    const duration = payload.duration

    console.log("[job-post] Extracted fields:")
    console.log("  title:", title, "(type:", typeof title, ")")
    console.log("  description:", description, "(type:", typeof description, ")")
    console.log("  category:", category, "(type:", typeof category, ")")
    console.log("  required_skills:", required_skills, "(type:", typeof required_skills, ")")
    console.log("  budget:", budget, "(type:", typeof budget, ")")
    console.log("  budget_type:", budget_type, "(type:", typeof budget_type, ")")
    console.log("  location:", location, "(type:", typeof location, ")")
    console.log("  duration:", duration, "(type:", typeof duration, ")")

    // Normalize budget_type for case-insensitive input and label-like values
    budget_type = normalizeBudgetType(budget_type)
    console.log("[job-post] budget_type after normalization:", budget_type, "(type:", typeof budget_type, ")")
    console.log("[job-post] budget_type charCodes:", [...(budget_type || '').split('')].map(c => c.charCodeAt(0)))

    if (!title || !description || !category || !location || budget === undefined || budget === null) {
      console.error("[job-post] Missing required fields validation failed")
      return NextResponse.json({ 
        error: "Missing required job fields.",
        receivedFields: { title: !!title, description: !!description, category: !!category, location: !!location, budget: budget !== undefined && budget !== null }
      }, { status: 400 })
    }

    // Validate budget is a valid number
    const budgetNum = Number(budget)
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return NextResponse.json({ error: "Budget must be a valid positive number." }, { status: 400 })
    }

    // Validate category is in the allowed list
    const allowedCategories = ["Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning", "Landscaping", "HVAC", "Roofing", "Masonry", "Welding", "Other"]
    if (!allowedCategories.includes(category)) {
      console.log("[job-post] Category not in allowed list, using as-is:", category)
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, phone, location")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Unable to verify profile." }, { status: 400 })
    }

    if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
      return NextResponse.json(
        { error: "Please complete your profile (Name, Email, Phone, Location) before posting a job." },
        { status: 400 },
      )
    }

    // budget_type is already normalized at the start of this function
    const budgetTypeDb = budget_type || 'fixed price'
    
    console.log("[job-post] budget_type received from payload:", budget_type)
    console.log("[job-post] budget_type final:", budgetTypeDb)

    // Validate budget_type one more time before building payload
    if (budgetTypeDb !== 'fixed price' && budgetTypeDb !== 'hourly rate') {
      console.error("[job-post] CRITICAL: budgetTypeDb is invalid:", budgetTypeDb)
      console.error("[job-post] budgetTypeDb type:", typeof budgetTypeDb)
      console.error("[job-post] budgetTypeDb length:", budgetTypeDb?.length)
      console.error("[job-post] budgetTypeDb charCodes:", [...(budgetTypeDb || '').split('')].map(c => c.charCodeAt(0)))
      return NextResponse.json({ 
        error: `Invalid budget type: '${budgetTypeDb}' (must be 'fixed price' or 'hourly rate')`,
        receivedType: typeof budgetTypeDb,
        receivedValue: budgetTypeDb,
        charCodes: [...(budgetTypeDb || '').split('')].map(c => c.charCodeAt(0))
      }, { status: 400 })
    }

    // Build job payload - handle required_skills carefully
    const skillsArray = Array.isArray(required_skills) ? required_skills : []
    console.log("[job-post] required_skills input:", required_skills, "type:", typeof required_skills)
    console.log("[job-post] skillsArray:", skillsArray, "isArray:", Array.isArray(skillsArray))
    
    const isMissingColumn = (err: any, colName: string) => {
      if (!err) return false
      const msg = String(err.message || err).toLowerCase()
      if (err?.code === "PGRST204") return msg.includes(colName.toLowerCase())
      return msg.includes(colName.toLowerCase()) && msg.includes("does not exist")
    }

    const baseJobPayload = {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      required_skills: skillsArray,
      budget: budgetNum,
      budget_type: budgetTypeDb,
      location: location.trim(),
      duration: (duration || "one-time").trim(),
      status: "open",
    }

    // Try client_id first (preferred by RLS policies), then fallback to poster_id
    let clientIdPayload: Record<string, any> = {
      client_id: user.id,
      ...baseJobPayload,
    }

    const posterIdPayload: Record<string, any> = {
      poster_id: user.id,
      ...baseJobPayload,
    }

    // Filter to only include expected columns (defensive against extra fields)
    const expectedColumns = [
      'title', 'description', 'category', 'required_skills', 'budget',
      'budget_type', 'location', 'duration', 'status', 'client_id', 'poster_id'
    ]
    
    const filterPayload = (payload: Record<string, any>) => {
      const filtered: Record<string, any> = {}
      for (const col of expectedColumns) {
        if (col in payload) {
          filtered[col] = payload[col]
        }
      }
      return filtered
    }
    
    clientIdPayload = filterPayload(clientIdPayload)

    // Validate payload before sending
    console.log("[job-post] posting with client_id:", clientIdPayload.client_id)
    console.log("[job-post] title:", clientIdPayload.title)
    console.log("[job-post] description length:", clientIdPayload.description?.length)
    console.log("[job-post] category:", clientIdPayload.category)
    console.log("[job-post] required_skills type:", typeof clientIdPayload.required_skills)
    console.log("[job-post] required_skills is array:", Array.isArray(clientIdPayload.required_skills))
    console.log("[job-post] budget:", clientIdPayload.budget)
    console.log("[job-post] budget_type:", clientIdPayload.budget_type)
    console.log("[job-post] location:", clientIdPayload.location)
    console.log("[job-post] duration:", clientIdPayload.duration)
    console.log("[job-post] status:", clientIdPayload.status)

    console.log("[job-post] full payload:", JSON.stringify(clientIdPayload, null, 2))
    console.log("[job-post] budget_type in final payload:", clientIdPayload.budget_type, "(type:", typeof clientIdPayload.budget_type, ")")
    console.log("[job-post] budget_type charCodes:", [...(clientIdPayload.budget_type || '').split('')].map(c => c.charCodeAt(0)))

    // Use service role client to bypass RLS for testing
    if (!SERVICE_ROLE_KEY) {
      console.error("[job-post] SERVICE_ROLE_KEY not configured")
      return NextResponse.json({ error: "Service role key not configured." }, { status: 500 })
    }
    
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    let attemptedPayload: Record<string, any> = clientIdPayload
    console.log("[job-post] Attempting insert with service client, bypassing RLS")
    
    let insertResult: any = {}
    try {
      insertResult = await serviceClient
        .from("jobs")
        .insert([attemptedPayload])
        .select()
        .single()
      console.log("[job-post] Insert result received:", insertResult)
    } catch (dbError: any) {
      console.error("[job-post] Database operation threw exception:", dbError)
      console.error("[job-post] Exception details:", JSON.stringify(dbError, null, 2))
      return NextResponse.json({ 
        error: "Database operation failed",
        dbError: dbError.message,
        attemptedPayload: attemptedPayload
      }, { status: 500 })
    }

    if (insertResult.error && isMissingColumn(insertResult.error, "client_id")) {
      console.warn("[job-post] client_id column not found, retrying with poster_id")
      attemptedPayload = posterIdPayload
      try {
        insertResult = await serviceClient
          .from("jobs")
          .insert([attemptedPayload])
          .select()
          .single()
        console.log("[job-post] Retry insert result received:", insertResult)
      } catch (retryDbError: any) {
        console.error("[job-post] Retry database operation threw exception:", retryDbError)
        return NextResponse.json({ 
          error: "Database retry operation failed",
          dbError: retryDbError.message,
          attemptedPayload: attemptedPayload
        }, { status: 500 })
      }
    }

    const { data: createdJob, error: insertError } = insertResult

    if (insertError) {
      console.error("[job-post] insert error", insertError)
      console.error("[job-post] insert error details:", JSON.stringify(insertError, null, 2))
      console.error("[job-post] payload that failed:", attemptedPayload)
      console.error("[job-post] payload keys:", Object.keys(attemptedPayload))
      
      // Build detailed error message
      let errorMessage = insertError.message || "Failed to create job."
      if (insertError.details) {
        errorMessage += " Details: " + insertError.details
      }
      if (insertError.hint) {
        errorMessage += " Hint: " + insertError.hint
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        sentPayload: Object.keys(attemptedPayload)
      }, { status: 500 })
    }

    console.log("[job-post] Insert successful! Created job:", createdJob)

    let notificationsSent = 0
    if (SERVICE_ROLE_KEY && (SENDGRID_API_KEY || RESEND_API_KEY)) {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })

      const locationFilter = clientIdPayload.location.trim()
      let workerQuery = adminClient
        .from("profiles")
        .select("email, full_name, location")
        .eq("role", "worker")
        .not("email", "is", null)

      if (locationFilter && locationFilter.toLowerCase() !== "anywhere") {
        workerQuery = workerQuery.ilike("location", `%${locationFilter}%`)
      }

      const { data: workers, error: workerError } = await workerQuery
      if (!workerError && workers?.length) {
        const recipients = workers
          .map((worker: any) => worker.email)
          .filter(Boolean)
          .slice(0, 500)

        try {
          const protocol = request.headers.get("x-forwarded-proto") || "https"
          const host = request.headers.get("host") || "localfixkenya.com"
          const baseUrl = `${protocol}://${host}`

          notificationsSent = await sendEmailAlerts(recipients, createdJob, baseUrl)
        } catch (emailError) {
          console.error("[job-post] email alert error", emailError)
        }
      }
    }

    return NextResponse.json({ job: createdJob, notificationsSent })
  } catch (error: any) {
    console.error("[job-post] CATCH BLOCK error:", error)
    console.error("[job-post] error stack:", error?.stack)
    console.error("[job-post] error name:", error?.name)
    
    // Check if it's a Supabase error
    if (error?.code) {
      console.error("[job-post] Supabase error code:", error.code)
    }
    
    return NextResponse.json({ 
      error: error?.message || "Job creation failed.",
      errorType: error?.name || "Unknown",
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}
