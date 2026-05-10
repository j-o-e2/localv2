"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, AlertCircle, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import JobChat from "@/components/ui/job-chat"
import { TierBadge } from "@/components/TierBadge"

interface Job {
  id: string
  title: string
  description: string
  category: string
  required_skills: string[]
  budget: number
  budget_type: string
  poster_id?: string
  location: string
  duration: string
  status: string
  created_at: string
  client_id: string
  profiles?: {
    full_name: string
    avatar_url: string
    profile_tier?: string
    email?: string
    phone?: string
  }
}

interface Application {
  id: string
  status: string
  cover_letter: string
  proposed_rate: number
  client_contact_revealed?: boolean
}

export default function JobDetailsClient({ jobId }: { jobId: string }) {
  const router = useRouter()

  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userApplication, setUserApplication] = useState<Application | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [applicationData, setApplicationData] = useState({
    coverLetter: "",
    proposedRate: "",
  })
  const [skillsConfirmed, setSkillsConfirmed] = useState(false)

  const makePrintable = (err: any) => {
    if (!err) return "Unknown error"
    if (typeof err === "string") return err
    if (err?.message) return err.message
    try {
      const names = Object.getOwnPropertyNames(err)
      const data: Record<string, any> = {}
      names.forEach((n) => (data[n] = err[n]))
      return JSON.stringify(data)
    } catch (e) {
      return String(err)
    }
  }

  async function attemptWithSchemaRetry<T = any>(fn: () => any, retries = 3, delayMs = 1000): Promise<T> {
    let lastErr: any = null
    for (let i = 0; i < retries; i++) {
      try {
        const maybe = fn()
        const result = maybe && typeof (maybe as any).then === "function" ? await maybe : maybe
        return result as T
      } catch (e) {
        lastErr = e
        const msg = String((e && ((e as any).message || e)) || "").toLowerCase()
        const isSchemaMissing = (e && (e as any).code === "PGRST204") || (msg.includes("could not find") && msg.includes("job_applications")) || msg.includes("schema cache")
        if (!isSchemaMissing) throw e
        console.warn(`Transient schema-cache error detected (attempt ${i + 1}/${retries}), retrying in ${delayMs}ms:`, msg)
        await new Promise((res) => setTimeout(res, delayMs))
      }
    }
    throw lastErr
  }

  useEffect(() => {
    fetchJobDetails()
    fetchCurrentUser()
  }, [jobId])

  useEffect(() => {
    if (user && job) {
      checkUserApplication()
    }
  }, [user, job])

  useEffect(() => {
    if (userApplication && userApplication.status === "accepted") {
      setShowChat(true)
    }
  }, [userApplication])

  const fetchJobDetails = async () => {
    try {
      if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
        setError("No job ID provided")
        setLoading(false)
        return
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(jobId)) {
        setError("Invalid job ID format")
        setLoading(false)
        return
      }

      let { data, error } = await attemptWithSchemaRetry(() =>
        supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .limit(1)
          .maybeSingle()
      )

      if (error) {
        console.error("[fetchJobDetails] Supabase job query error:", makePrintable(error), error)
        setError("Unable to load job details")
        return
      }

      if (!data) {
        setError("Job not found")
        return
      }

      if (data && (data.required_skills === undefined || data.required_skills === null)) {
        const { data: skillsOnly, error: skillsError } = await attemptWithSchemaRetry(() =>
          supabase
            .from("jobs")
            .select("required_skills")
            .eq("id", jobId)
            .limit(1)
            .maybeSingle()
        )

        if (!skillsError && skillsOnly && skillsOnly.required_skills != null) {
          data.required_skills = skillsOnly.required_skills
        }
      }

      if (data) {
        const ownerId = data.poster_id ?? data.client_id
        try {
          const { data: profileData, error: profileError } = await attemptWithSchemaRetry(() =>
            supabase
              .from("profiles")
              .select("full_name, avatar_url, email, phone, location, profile_tier")
              .eq("id", ownerId)
              .maybeSingle()
          )

          if (!profileError) {
            data.profiles = profileData || {
              full_name: "Anonymous",
              avatar_url: null,
              email: null,
              phone: null,
              location: null,
              profile_tier: "basic",
            }
          }
        } catch (e) {
          console.error("Error fetching poster profile:", e)
          data.profiles = {
            full_name: "Anonymous",
            avatar_url: null,
            email: null,
            phone: null,
            location: null,
            profile_tier: "basic",
          }
        }
      }

      if (data) {
        const normalizeSkills = (val: any): string[] => {
          if (!val && val !== 0) return []
          if (Array.isArray(val)) return val.map((v) => String(v))
          if (typeof val === "string") {
            const s = val.trim()
            if (!s || s === "[]" || s === "{}") return []
            try {
              const parsed = JSON.parse(s)
              if (Array.isArray(parsed)) return parsed.map((v) => String(v))
            } catch (e) {}
            return s.split(",").map((p) => p.trim()).filter(Boolean)
          }
          try {
            if (typeof val === "object") {
              if (Array.isArray((val as any).value)) return (val as any).value.map((v: any) => String(v))
              const vals = Object.values(val).filter((v) => v !== null && v !== undefined)
              if (vals.length > 0) return vals.map((v) => String(v))
            }
          } catch (e) {}
          return []
        }

        data.required_skills = normalizeSkills(data.required_skills)

        const rawType = String(data.budget_type ?? "").trim().toLowerCase()
        data.budget_type = rawType === "hourly" ? "hourly" : "fixed"

        if (data.budget == null || Number.isNaN(Number(data.budget))) {
          data.budget = 0
        } else {
          data.budget = Number(data.budget)
        }
      }

      setJob(data)
    } catch (err) {
      console.error("Error fetching job:", makePrintable(err), err)
      setError(`Unable to load job details: ${makePrintable(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    } catch (err) {
      console.error("Error fetching user:", err)
    }
  }

  const checkUserApplication = async () => {
    try {
      const { data, error } = await supabase
        .from("job_applications")
        .select("*")
        .eq("job_id", jobId)
        .eq("provider_id", user.id)
        .maybeSingle()

      if (error && error.code !== "PGRST116") {
        const msg = String(error.message || error).toLowerCase()
        if (error?.code === "PGRST204" && msg.includes("job_applications")) {
          console.warn("Schema cache: 'job_applications' table not found. Skipping application check.")
          setUserApplication(null)
          return
        }

        if (msg.includes("job_applications") && (msg.includes("could not find") || msg.includes("does not exist"))) {
          console.warn("Schema/table missing for job_applications; skipping application check.")
          setUserApplication(null)
          return
        }

        console.error("Error checking application:", makePrintable(error), error)
        return
      }

      if (data) setUserApplication(data)
    } catch (err) {
      console.error("Error checking application:", makePrintable(err), err)
    }
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      if (!user) {
        router.push("/login")
        return
      }

      if (!applicationData.coverLetter || !applicationData.proposedRate) {
        setError("Please fill in all fields")
        return
      }

      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, email, phone, location")
          .eq("id", user.id)
          .single()

        if (profileError || !profile) {
          setError("Unable to verify profile. Please try again.")
          setSubmitting(false)
          return
        }

        if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
          setError("Please complete your profile (Name, Email, Phone, Location) before applying for jobs.")
          setSubmitting(false)
          return
        }
      } catch (err) {
        console.error("Profile check error:", err)
        setError("Error checking profile. Please try again.")
        setSubmitting(false)
        return
      }

      if (job && Array.isArray(job.required_skills) && job.required_skills.length > 0 && !skillsConfirmed) {
        setError("Please confirm you have the required skills before applying.")
        setSubmitting(false)
        return
      }

      try {
        const profileRes = (await attemptWithSchemaRetry(() =>
          supabase.from("profiles").select("id").eq("id", user.id).maybeSingle()
        )) as any
        const { data: profileRow, error: profileError } = profileRes || {}
        if (profileError) {
          console.warn("Error checking profile existence:", profileError)
        }
        if (!profileRow) {
          setError("Please complete your profile before applying for jobs")
          setSubmitting(false)
          return
        }
      } catch (e) {
        console.warn("Profile existence check failed:", e)
        const printable = makePrintable(e)
        if (String(printable).toLowerCase().includes("job_applications") || String(printable).toLowerCase().includes("schema cache")) {
          setError("Server schema error: the job_applications table is not available. Please run the database migrations or refresh your Supabase schema cache and try again.")
          setSubmitting(false)
          return
        }
      }

      const response = await fetch("/api/job-applications", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          coverLetter: applicationData.coverLetter,
          proposedRate: Number.parseFloat(applicationData.proposedRate),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        const lower = String(result?.error || "").toLowerCase()
        if (response.status === 401 || lower.includes("permission") || lower.includes("forbidden") || lower.includes("not authenticated") || lower.includes("auth")) {
          setError("Permission denied. Please sign in and try again.")
          router.push("/login")
          return
        }

        if (lower.includes("duplicate") || lower.includes("unique")) {
          setError("You have already applied to this job")
          return
        }

        setError(result?.error || "Failed to submit application")
        return
      }

      const insertedApplication = result

      setApplicationData({ coverLetter: "", proposedRate: "" })
      setSkillsConfirmed(false)
      setShowApplicationForm(false)
      setUserApplication(insertedApplication)
      await checkUserApplication()

      try {
        await fetchJobDetails()
      } catch (e) {
        console.warn("Failed to refresh job details after application:", e)
      }
    } catch (err) {
      const rawMsg = String((err && ((err as any).message || err)) || "").toLowerCase()
      if ((err && ((err as any).code === "PGRST204")) || (rawMsg.includes("job_applications") && (rawMsg.includes("could not find") || rawMsg.includes("does not exist")))) {
        console.warn("Schema/table missing for job_applications during insert:", rawMsg)
        setError("Server schema error: the job_applications table is not available. Please run the database migrations (scripts/003_create_jobs_tables.sql) or refresh your Supabase schema cache and try again.")
        return
      }

      const printable = makePrintable(err)
      console.error("Error submitting application:", printable)

      const lower = String(printable).toLowerCase()
      if (lower.includes("duplicate") || lower.includes("unique")) {
        setError("You have already applied to this job")
      } else if (lower.includes("permission") || lower.includes("policy") || lower.includes("forbidden") || lower.includes("not authenticated") || lower.includes("auth")) {
        setError("Permission denied. Please sign in and try again.")
      } else if (lower.includes("foreign key") || lower.includes("violates foreign key")) {
        setError("Submission failed: your user profile may be missing in the database. Please ensure your profile exists before applying.")
      } else {
        setError(String(printable) || "Failed to submit application")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="inline-block"
          >
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </Button>
          </div>
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground text-lg">{error || "Job not found"}</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="cursor-pointer"
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Job Details</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="mb-4">
                <h2 className="text-3xl font-bold text-foreground mb-2">{job.title}</h2>
                <p className="text-muted-foreground">{job.category}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pb-6 border-b border-border">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Budget</p>
                  <p className="text-2xl font-bold text-primary">KES {job.budget.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{job.budget_type === "fixed" ? "Fixed" : "Hourly"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Duration</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{job.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Location</p>
                  <p className="text-lg font-semibold text-foreground">{job.location}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-foreground whitespace-pre-wrap">{job.description}</p>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Workers should have these skills before applying for this job.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Posted by</h3>
              {(() => {
                const ownerId = job.poster_id ?? job.client_id
                const isOwner = user?.id && ownerId === user.id
                const isAcceptedWorker = userApplication && userApplication.status === "accepted"

                if (isOwner || isAcceptedWorker) {
                  return (
                    <Link href={`/profile/${ownerId}`}>
                      <div className="space-y-3 hover:bg-muted/50 rounded p-3 transition-colors cursor-pointer">
                        <div className="flex items-center gap-4">
                          {job.profiles?.avatar_url && (
                            <img
                              src={job.profiles.avatar_url || "/placeholder.svg"}
                              alt={job.profiles.full_name}
                              className="w-12 h-12 rounded-full bg-secondary object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">{job.profiles?.full_name || "Anonymous"}</p>
                              <TierBadge tier={(job.profiles?.profile_tier || "basic") as "basic" | "pro" | "verified" | "trusted" | "elite"} size="sm" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Posted {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {job.profiles?.email && (
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Email</p>
                            <p className="text-foreground">{job.profiles.email}</p>
                          </div>
                        )}
                        {job.profiles?.phone && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Phone</p>
                            <p className="text-foreground">{job.profiles.phone}</p>
                          </div>
                        )}
                        {job.profiles?.location && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Location</p>
                            <p className="text-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {job.profiles.location}
                            </p>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                }

                return (
                  <div className="p-4 bg-muted/10 rounded">
                    <p className="text-sm text-foreground">Client details are hidden</p>
                    <p className="text-xs text-muted-foreground">You will be able to view the client's contact information if your application is accepted.</p>
                  </div>
                )
              })()}
            </Card>
          </div>

          <div>
            {(showChat || (userApplication && userApplication.status === "accepted")) ? (
              <JobChat
                jobId={jobId}
                jobApplicationId={userApplication?.id}
                recipientId={job?.client_id || job?.poster_id || ""}
                recipientName={job?.profiles?.full_name || "Client"}
                currentUserId={user?.id || ""}
              />
            ) : (
              <Card className="p-6 md:sticky md:top-8">
                {userApplication ? (
                  <div>
                    <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm font-medium text-primary">
                        Application Status: <span className="capitalize">{userApplication.status}</span>
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Your Proposed Rate</p>
                        <p className="text-lg font-semibold text-foreground">
                          KES {userApplication.proposed_rate?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                      {userApplication.cover_letter && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Your Cover Letter</p>
                          <p className="text-sm text-foreground line-clamp-3">{userApplication.cover_letter}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <Button onClick={() => setShowChat(true)} className="w-full bg-primary hover:bg-primary/90">
                        Start Chat
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {!showApplicationForm ? (
                      <Button
                        onClick={() => {
                          if (!user) {
                            window.location.href = "/signup?role=worker"
                            return
                          }
                          setSkillsConfirmed(false)
                          setShowApplicationForm(true)
                        }}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        Apply for This Job
                      </Button>
                    ) : (
                      <form onSubmit={handleApplicationSubmit} className="space-y-4">
                        {error && (
                          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                          </div>
                        )}

                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-sm font-semibold text-foreground mb-3">Required Skills</p>
                          {(job.required_skills || []).length > 0 ? (
                            <>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {(job.required_skills || []).map((skill) => (
                                  <span key={skill} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                              <label className="flex items-center gap-3 text-sm">
                                <input
                                  type="checkbox"
                                  checked={skillsConfirmed}
                                  onChange={(e) => setSkillsConfirmed(e.target.checked)}
                                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span>
                                  I confirm I have the required skills for this job.
                                </span>
                              </label>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No required skills were listed for this job. Fill out the form below to apply.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Cover Letter</label>
                          <textarea
                            value={applicationData.coverLetter}
                            onChange={(e) =>
                              setApplicationData((prev) => ({
                                ...prev,
                                coverLetter: e.target.value,
                              }))
                            }
                            placeholder="Tell the job poster why you're a great fit..."
                            rows={4}
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">Proposed Rate (KES)</label>
                          <input
                            type="number"
                            value={applicationData.proposedRate}
                            onChange={(e) =>
                              setApplicationData((prev) => ({
                                ...prev,
                                proposedRate: e.target.value,
                              }))
                            }
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button type="submit" disabled={submitting} className="w-full sm:flex-1 bg-primary hover:bg-primary/90">
                            {submitting ? "Submitting..." : "Submit"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowApplicationForm(false)
                              setSkillsConfirmed(false)
                            }}
                            className="w-full sm:flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
