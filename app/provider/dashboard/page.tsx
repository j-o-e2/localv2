"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { ArrowLeft, TrendingUp, Users, Calendar, DollarSign, Check, X, Clock, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface Booking {
  id: string
  booking_date: string
  status: string
  notes: string | null
  service_id: string
  client_id: string
  services: {
    id: string
    name: string
    price: number
    category: string
  } | null
  profiles: {
    id: string
    full_name: string
    phone: string
    email: string
    location: string
  } | null
}

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) {
        console.error('Auth error:', authError)
        alert('Authentication error: ' + authError.message)
        return
      }
      if (!user) {
        console.log('No user logged in')
        alert('Please log in to view bookings')
        return
      }
      console.log('Current user:', user.id)

      // Use API route to fetch bookings (bypasses RLS)
      const response = await fetch(`/api/provider/bookings?provider_id=${user.id}`)
      const result = await response.json()
      
      console.log('API response:', response.status, result)

      if (!response.ok) {
        alert('Error loading bookings: ' + result.error)
        return
      }

      setBookings(result.bookings || [])
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateBookingStatus = async (bookingId: string, action: string) => {
    console.log('Updating booking:', bookingId, 'action:', action)
    setUpdating(bookingId)
    try {
      const response = await fetch(`/api/provider/bookings/${bookingId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const result = await response.json()
      console.log('Update response:', response.status, result)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update booking')
      }

      // Refresh the bookings list
      fetchBookings()
    } catch (err: any) {
      console.error('Error updating booking:', err)
      alert(err.message || 'Failed to update booking status')
    } finally {
      setUpdating(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
      pending: { color: 'text-yellow-800', bg: 'bg-yellow-100', label: 'Pending' },
      approved: { color: 'text-green-800', bg: 'bg-green-100', label: 'Approved' },
      confirmed: { color: 'text-blue-800', bg: 'bg-blue-100', label: 'Confirmed' },
      completed: { color: 'text-purple-800', bg: 'bg-purple-100', label: 'Completed' },
      cancelled: { color: 'text-red-800', bg: 'bg-red-100', label: 'Cancelled' },
      rejected: { color: 'text-red-800', bg: 'bg-red-100', label: 'Rejected' },
    }
    const config = statusConfig[status] || { color: 'text-gray-800', bg: 'bg-gray-100', label: status }
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        {config.label}
      </span>
    )
  }

  // Calculate stats from real data
  const totalEarnings = bookings
    .filter(b => b.status === 'completed' || b.status === 'approved')
    .reduce((sum, b) => sum + (b.services?.price || 0), 0)
  const completedJobs = bookings.filter(b => b.status === 'completed').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length

  const STATS = [
    { label: "Total Earnings", value: `KES ${totalEarnings.toLocaleString()}`, icon: DollarSign },
    { label: "Completed Jobs", value: completedJobs.toString(), icon: Calendar },
    { label: "Pending Bookings", value: pendingBookings.toString(), icon: Clock },
    { label: "Rating", value: "4.8/5", icon: TrendingUp },
  ]

  const CHART_DATA = [
    { month: "Jan", earnings: 3000 },
    { month: "Feb", earnings: 4500 },
    { month: "Mar", earnings: 3800 },
    { month: "Apr", earnings: 5200 },
    { month: "May", earnings: 6100 },
    { month: "Jun", earnings: 5800 },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Provider Dashboard</h1>
        </div>
      </header>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {STATS.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-primary" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Earnings Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Monthly Bookings</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
                <YAxis stroke="var(--color-muted-foreground)" />
                <Tooltip />
                <Bar dataKey="earnings" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Bookings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Booking Requests</h3>
          {loading ? (
            <p className="text-muted-foreground">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No booking requests yet</p>
              <p className="text-sm text-muted-foreground">Clients will see your services and can book them</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchBookings()}
              >
                Refresh
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Client</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-border hover:bg-secondary">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-foreground">{booking.profiles?.full_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{booking.profiles?.phone || ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{booking.services?.name || 'Unknown'}</td>
                      <td className="py-3 px-4 text-foreground">
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        KES {booking.services?.price?.toLocaleString() || 0}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 flex-wrap">
                          {booking.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateBookingStatus(booking.id, 'approve')}
                                disabled={updating === booking.id}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateBookingStatus(booking.id, 'reject')}
                                disabled={updating === booking.id}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {booking.status === 'approved' && (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                              onClick={() => updateBookingStatus(booking.id, 'complete')}
                              disabled={updating === booking.id}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Complete
                            </Button>
                          )}
                          {(booking.status === 'approved' || booking.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, 'cancel')}
                              disabled={updating === booking.id}
                            >
                              Cancel
                            </Button>
                          )}
                          {booking.status === 'rejected' && (
                            <span className="text-sm text-muted-foreground">Rejected</span>
                          )}
                          {booking.status === 'cancelled' && (
                            <span className="text-sm text-muted-foreground">Cancelled</span>
                          )}
                          {booking.status === 'completed' && (
                            <span className="text-sm text-green-600">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  )
}
