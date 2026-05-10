"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon, Loader2, ZoomIn, X } from "lucide-react"

interface WorkImage {
  id: string
  title: string | null
  description: string | null
  image_url: string
  created_at: string
}

interface WorkImageGalleryProps {
  userId: string
  showTitle?: string
}

export default function WorkImageGallery({ userId, showTitle }: WorkImageGalleryProps) {
  const [images, setImages] = useState<WorkImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<WorkImage | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    loadImages()
  }, [userId])

  async function loadImages() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/work-images?userId=${userId}`)
      const data = await res.json()
      if (data.images) {
        setImages(data.images)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (images.length === 0) {
    return null // Don't show section if no images
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ImageIcon className="h-5 w-5" />
        {showTitle || "Work Gallery"} ({images.length})
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group rounded-lg overflow-hidden border cursor-pointer"
            onClick={() => {
              setSelectedImage(image)
              setZoomLevel(1)
            }}
          >
            <img
              src={image.image_url}
              alt={image.title || "Work image"}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-x-0 bottom-2 flex items-center justify-end pr-2">
              <div className="bg-black/60 rounded-full p-1 text-white">
                <ZoomIn className="h-4 w-4" />
              </div>
            </div>
            {image.title && (
              <div className="p-2">
                <p className="font-medium text-sm truncate">{image.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] w-full rounded-2xl bg-slate-950/95 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                {selectedImage.title && (
                  <h4 className="text-xl font-semibold">{selectedImage.title}</h4>
                )}
                {selectedImage.description && (
                  <p className="text-sm text-gray-300 mt-1">{selectedImage.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((value) => Math.max(1, value - 0.25))}
                  className="rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
                >
                  −
                </button>
                <span className="min-w-[48px] text-center text-sm">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((value) => Math.min(3, value + 0.25))}
                  className="rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20"
                >
                  +
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.title || "Work image"}
                className="mx-auto block max-h-[70vh] object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}