"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'

interface AttendanceModalProps {
  open: boolean
  bookingId: string
  onClose: () => void
  onSubmit: (data: { bookingId: string; attended: boolean; notes: string; attendanceDate: string }) => void
  isLoading?: boolean
}

export default function AttendanceModal({ open, bookingId, onClose, onSubmit, isLoading = false }: AttendanceModalProps) {
  const [attended, setAttended] = useState(true)
  const [notes, setNotes] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])

  const handleSubmit = async () => {
    if (!attendanceDate.trim()) {
      alert('Please select a date')
      return
    }

    onSubmit({
      bookingId,
      attended,
      notes,
      attendanceDate,
    })

    // Reset form
    setAttended(true)
    setNotes('')
    setAttendanceDate(new Date().toISOString().split('T')[0])
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Mark Attendance</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Attendance Status */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Attendance Status</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setAttended(true)}
                disabled={isLoading}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  attended
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                ✓ Attended
              </button>
              <button
                type="button"
                onClick={() => setAttended(false)}
                disabled={isLoading}
                className={`flex-1 py-2 px-3 rounded-lg font-medium transition-colors ${
                  !attended
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                ✗ Absent
              </button>
            </div>
          </div>

          {/* Attendance Date */}
          <div className="space-y-2">
            <label htmlFor="attendanceDate" className="text-sm font-medium text-foreground">
              Attendance Date
            </label>
            <input
              id="attendanceDate"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              placeholder="Add any additional notes about the visit..."
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
