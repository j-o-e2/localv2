import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

async function getAuthenticatedUser(request: NextRequest, cookieStore: any, supabase: any) {
  const { data: { user } = {} as any, error: cookieError } = await supabase.auth.getUser()
  if (user) return user

  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  if (!token) return null

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceRoleKey || !supabaseUrl) return null

  try {
    const tokenClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })
    const { data: { user: tokenUser } = {} as any, error: tokenError } = await tokenClient.auth.getUser()
    if (tokenError || !tokenUser) {
      console.warn('[getAuthenticatedUser] token auth failed', tokenError)
      return null
    }
    return tokenUser
  } catch (err) {
    console.error('[getAuthenticatedUser] error', err)
    return null
  }
}

export async function PATCH(request: NextRequest, context: any) {
  try {
    let params = context?.params
    if (params && typeof params.then === "function") params = await params
    const id = params?.id
    const cookieStore = await cookies()
    // Pass Next's cookie store directly (cast to any) so the expected
    // cookie methods shape matches the supabase helper's types.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: cookieStore as any },
    )

    // Service-role client for server-side reads/writes (bypass RLS for these checks)
    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: (_cookies: any) => {} } as any }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Parse body early so we can use accessToken fallback if cookies are missing
    const body = await request.json().catch(() => ({}))

    let authUser = user || null
    // Fallback: if no session-based user, try to extract from Authorization header (Bearer token)
    if (!authUser) {
      const incomingAuth = request.headers.get('authorization') || ''
      let token = incomingAuth.startsWith('Bearer ') ? incomingAuth.substring(7) : null
      // Fallback: client may send accessToken in request body
      if (!token && (body as any)?.accessToken) token = (body as any).accessToken
      if (token) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'))
            if (payload?.sub) {
              authUser = { id: payload.sub } as any
              console.log('PATCH /api/job-applications/: extracted user from token', (authUser as any).id)
            }
          }
        } catch (e) {
          console.warn('Failed to decode token in job-application PATCH fallback:', e)
        }
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  // body already parsed above

    // Verify application ownership or job ownership (defensive)
    const { data: application, error: fetchError } = await serviceClient
      .from("job_applications")
      .select("provider_id, job_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    // Check if user is the provider or the job poster
    let isAuthorized = application.provider_id === authUser.id

    if (!isAuthorized) {
      const { data: job, error: jobError } = await serviceClient
        .from("jobs")
        .select("client_id")
        .eq("id", application.job_id)
        .limit(1)
        .maybeSingle()

      if (jobError) throw jobError

      isAuthorized = job?.client_id === authUser.id
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // First verify the application exists and get its current status using the service client
    const { data : currentApp, error: checkError } = await serviceClient
      .from("job_applications")
      .select("status")
      .eq("id", id)
      .single()

    if (checkError) {
      console.error("Error checking current application:", checkError)
      return NextResponse.json({ 
        error: "Failed to verify application status",
        details: checkError.message
      }, { status: 500 })
    }

    if (!currentApp) {
      return NextResponse.json({ 
        error: "Application no longer exists",
        details: "The application may have been deleted"
      }, { status: 404 })
    }

    // Applications are removable by either side, including accepted applications.
    // Validate requested status if present and only allow permitted columns
    const allowedStatuses = ["pending", "accepted", "rejected", "withdrawn"]
    if ((body as any)?.status !== undefined && !allowedStatuses.includes((body as any).status)) {
      return NextResponse.json({ error: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` }, { status: 400 })
    }

    // Strip any client-only fields (like accessToken) and only allow permitted columns
    const allowed = ["status"]
    const updatePayload: Record<string, any> = {}
    for (const k of allowed) {
      if ((body as any)?.[k] !== undefined) updatePayload[k] = (body as any)[k]
    }
    updatePayload.updated_at = new Date().toISOString()

    console.log('PATCH /api/job-applications/: updating', { id, authUser: authUser?.id, updatePayload })

    const { data, error } = await serviceClient
      .from("job_applications")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single()

    if (error) {
      console.error("Error updating application:", error)
      return NextResponse.json({ 
        error: "Failed to update application",
        details: error.message
      }, { status: 500 })
    }

    if (!data) {
      console.error('Update returned no data for application', { id })
      return NextResponse.json({ 
        error: "Update failed",
        details: "No data returned after update"
      }, { status: 500 })
    }

    console.log('Updated application:', { id, data })

    // If the application was just accepted, reveal client contact details without charging a fee.
    const newStatus = updatePayload.status
    if (newStatus === 'accepted') {
      try {
        await serviceClient
          .from('job_applications')
          .update({ client_contact_revealed: true })
          .eq('id', id)
      } catch (e) {
        console.error('Error while updating contact reveal on acceptance:', e)
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error("Error updating application:", error)
    return NextResponse.json({ 
      error: "Failed to update application", 
      details: error?.message || "Unknown error"
    }, { status: 500 })
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

    const user = await getAuthenticatedUser(request, cookieStore, supabase)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use a service role client for the actual archive/delete operation once the user is authorized.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[DELETE] missing service role key or supabase URL')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

    // Verify application ownership: allow provider OR the job poster to archive
    const { data: application, error: fetchError } = await supabase
      .from("job_applications")
      .select("provider_id, job_id")
      .eq("id", id)
      .limit(1)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    let isAuthorized = application.provider_id === user.id
    if (!isAuthorized) {
      // Check if the requesting user is the job poster
      const { data: jobRow, error: jobErr } = await supabase
        .from('jobs')
        .select('client_id')
        .eq('id', application.job_id)
        .limit(1)
        .maybeSingle()

      if (jobErr) throw jobErr
      isAuthorized = jobRow?.client_id === user.id
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Soft-archive the application if supported; otherwise delete it.
    let archivedApp: any = null
    const { data: archiveData, error: archiveErr } = await serviceClient
      .from('job_applications')
      .update({ archived: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (archiveErr) {
      const errMsg = String(archiveErr.message || archiveErr).toLowerCase()
      if (errMsg.includes('column "archived" does not exist') || errMsg.includes('invalid column reference') || errMsg.includes('column archived does not exist')) {
        const { data: deleteData, error: deleteErr } = await serviceClient
          .from('job_applications')
          .delete()
          .eq('id', id)
          .select()
          .maybeSingle()

        if (deleteErr) {
          console.error('Error deleting application when archived field missing:', deleteErr)
          return NextResponse.json({ error: 'Failed to delete application', details: deleteErr.message }, { status: 500 })
        }

        archivedApp = deleteData
      } else {
        console.error('Error archiving application:', archiveErr)
        return NextResponse.json({ error: 'Failed to archive application', details: archiveErr.message }, { status: 500 })
      }
    } else {
      archivedApp = archiveData
    }

    return NextResponse.json({ success: true, archived: archivedApp })
  } catch (error: any) {
    console.error("Error deleting application:", error)
    return NextResponse.json({ error: "Failed to delete application", details: error?.message || "Unknown error" }, { status: 500 })
  }
}
