"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import LoadingOverlay from "@/components/LoadingOverlay"

interface JobPayload {
  client_id: string
  title: string
  description: string
  category: string
  required_skills: string[]
  budget: number
  budget_type: 'fixed price' | 'hourly rate'
  location: string
  duration: string
  status: 'open' | 'in-progress' | 'completed' | 'closed'
}

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Landscaping",
  "HVAC",
  "Roofing",
  "Masonry",
  "Welding",
  "Other",
]

const normalizeBudgetType = (input: any): "fixed price" | "hourly rate" => {
  if (input && typeof input === "object") {
    if ("value" in input) input = input.value
    else if ("label" in input) input = input.label
    else input = ""
  }

  // Multi-level sanitization: trim, lowercase, remove all whitespace, keep only letters
  const raw = String(input || "fixed")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "") // Remove all internal spaces
    .replace(/[^a-z]/g, "") // Keep only letters

  console.log("[normalizeBudgetType] Input:", input, "-> Raw:", raw)

  if (raw.includes("hourly") || raw.includes("hour")) return "hourly rate"
  if (raw.includes("fixed") || raw.includes("fix")) return "fixed price"
  
  // Fallback to fixed price if unclear
  console.warn("[normalizeBudgetType] Unclear value, defaulting to fixed price:", input)
  return "fixed price"
}

const COMMON_SKILLS = [
  "Plumbing",
  "Electrical Work",
  "Carpentry",
  "Painting",
  "Tile Work",
  "Drywall",
  "Flooring",
  "Roofing",
  "HVAC",
  "Welding",
  "Masonry",
  "Landscaping",
  "Cleaning",
  "Handyman",
  "Problem Solving",
]

export default function PostJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState("")
  const [customDuration, setCustomDuration] = useState("")
  const [customCategory, setCustomCategory] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    budgetType: "fixed", // This will be transformed to budget_type when sending to DB
    location: "",
    duration: "one-time"
  })

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to post a job")
        router.push("/login")
        return
      }

      // Check profile completion
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email, phone, location')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError("Unable to verify profile. Please try again.")
        setLoading(false)
        return
      }

      // Validate profile has all required fields
      if (!profile.full_name?.trim() || !profile.email?.trim() || !profile.phone?.trim() || !profile.location?.trim()) {
        setError("Please complete your profile (Name, Email, Phone, Location) before posting a job.")
        setLoading(false)
        return
      }

        // Validate required fields
        if (!formData.title?.trim() || !formData.description?.trim() || !formData.location?.trim()) {
          setError("Please fill in all required fields")
          setLoading(false)
          return
        }

        // Validate category
        let finalCategory = formData.category
        if (formData.category === "Other") {
          if (!customCategory.trim()) {
            setError("Please specify a custom category")
            setLoading(false)
            return
          }
          finalCategory = customCategory.trim()
        } else if (!formData.category) {
          setError("Please select a category")
          setLoading(false)
          return
        }
      
        // Validate budget
        const budget = parseFloat(formData.budget)
        if (isNaN(budget) || budget <= 0) {
          setError("Please enter a valid budget amount greater than 0")
          setLoading(false)
          return
        }

        // If custom duration selected, ensure customDuration provided
        if (formData.duration === 'custom' && !customDuration.trim()) {
          setError('Please provide a custom timeline for the job')
          setLoading(false)
          return
        }

      const normalizedBudgetType = normalizeBudgetType(formData.budgetType)
      const jobPayload: Record<string, any> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: finalCategory,
        required_skills: selectedSkills.length > 0 ? selectedSkills : [],
        budget: budget,
        budget_type: normalizedBudgetType,
        location: formData.location.trim(),
        duration: formData.duration === 'custom' ? (customDuration || formData.duration) : formData.duration,
        status: "open",
      }
      
      // Log for debugging
      console.log("[job-post-client] normalizedBudgetType:", normalizedBudgetType, "(type:", typeof normalizedBudgetType, ")")
      console.log("[job-post-client] budget_type being sent:", jobPayload.budget_type)
      console.log("[job-post-client] budget_type charCodes:", [...(jobPayload.budget_type || '').split('')].map(c => c.charCodeAt(0)))
      console.log("Full payload:", JSON.stringify(jobPayload, null, 2))
      console.log("Client: Full job payload:", jobPayload)

      console.log("Sending job payload to API:", JSON.stringify(jobPayload, null, 2))
      console.log("[client-debug] formData.budgetType:", formData.budgetType, "(type:", typeof formData.budgetType, ")")
      console.log("[client-debug] selectedSkills:", selectedSkills, "(length:", selectedSkills.length, ")")
      console.log("[client-debug] budget value:", budget, "(type:", typeof budget, ")")
      
      let response
      try {
        response = await fetch("/api/jobs/post", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(jobPayload),
        })
        console.log("[client-debug] Fetch completed, response status:", response.status)
      } catch (fetchError: any) {
        console.error("[client-debug] Fetch error:", fetchError)
        setError("Network error: " + fetchError.message)
        setLoading(false)
        return
      }

      console.log("Client: Response status:", response.status)
      console.log("Client: Response statusText:", response.statusText)

      let result: any = {}
      const responseText = await response.text()
      console.log("[client-debug] Raw response text:", responseText)
      console.log("[client-debug] Response text length:", responseText.length)

      try {
        if (responseText && responseText.trim()) {
          result = JSON.parse(responseText)
          console.log("[client-debug] Parsed response:", result)
        } else {
          result = { error: `Server returned empty response (HTTP ${response.status})` }
        }
      } catch (parseError) {
        console.error("[client-debug] Failed to parse response JSON:", parseError)
        console.error("[client-debug] Response text was:", responseText)
        result = { error: `Server error: ${response.statusText}` }
      }

      if (!response.ok) {
        console.error("Job post failed with status:", response.status)
        console.error("Error result:", result)
        
        // Show more detailed error
        let errorMsg = `Failed to post job (HTTP ${response.status})`
        if (result?.error) {
          errorMsg = result.error
        }
        if (result?.details) {
          errorMsg += ` - ${result.details}`
        }
        if (result?.hint) {
          errorMsg += ` - ${result.hint}`
        }
        
        setError(errorMsg)
        setLoading(false)
        return
      }

      alert("Job posted successfully! Providers in your area are being notified by email.")
      setIsRedirecting(true)
      router.push("/dashboard/client")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post job")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay isLoading={isRedirecting} message="Posting job..." />
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Post a New Job</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-slate-700 hover:text-[#1e3a8a]">Home</Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Fix leaking kitchen faucet"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the job in detail..."
                rows={5}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a category</option>
                {CATEGORIES.filter(cat => cat !== "Other").map((cat) => (
                  <option key={cat} value={cat} className="bg-card text-foreground">
                    {cat}
                  </option>
                ))}
                <option value="Other" className="bg-card text-foreground">Other (specify below)</option>
              </select>
              {formData.category === "Other" && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Enter custom category"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {/* Required Skills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Required Skills</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSkills.includes(skill)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {selectedSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1"
                    >
                      <span className="text-sm text-primary">{skill}</span>
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="text-primary hover:text-primary/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Custom Skill Input */}
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSkill.trim()) {
                      e.preventDefault()
                      if (!selectedSkills.includes(customSkill.trim())) {
                        setSelectedSkills([...selectedSkills, customSkill.trim()])
                        setCustomSkill("")
                      }
                    }
                  }}
                  placeholder="Add custom skill (press Enter)"
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
                      setSelectedSkills([...selectedSkills, customSkill.trim()])
                      setCustomSkill("")
                    }
                  }}
                  className="bg-primary hover:bg-primary/90"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Budget */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Budget</label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Budget Type</label>
                <select
                  name="budgetType"
                  value={formData.budgetType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="fixed" className="bg-card text-foreground">Fixed Price</option>
                  <option value="hourly" className="bg-card text-foreground">Hourly Rate</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Nairobi, Kayole"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Job Duration</label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="one-time" className="bg-card text-foreground">One-time</option>
                <option value="short-term" className="bg-card text-foreground">Short-term (1-3 months)</option>
                <option value="long-term" className="bg-card text-foreground">Long-term (3+ months)</option>
                <option value="custom" className="bg-card text-foreground">Custom timeline</option>
              </select>
              {formData.duration === 'custom' ? (
                <div className="mt-3">
                  <input
                    type="text"
                    name="customDuration"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    placeholder="e.g., 2 weeks, approx. 6 months"
                    className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Provide a free-text timeline to help applicants understand the schedule.</p>
                </div>
              ) : null}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary/90">
                {loading ? "Posting..." : "Post Job"}
              </Button>
              <Link href="/jobs" className="flex-1">
                <Button variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
