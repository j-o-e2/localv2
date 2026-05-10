"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"

interface WorkImage {
  id: string
  title: string | null
  description: string | null
  image_url: string
  created_at: string
}

interface WorkImageUploaderProps {
  userId: string
  onUploadSuccess?: (image: WorkImage) => void
  onDeleteSuccess?: (imageId: string) => void
}

export default function WorkImageUploader({
  userId,
  onUploadSuccess,
  onDeleteSuccess,
}: WorkImageUploaderProps) {
  const [images, setImages] = useState<WorkImage[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [previews, setPreviews] = useState<string[]>([])
  const [zoomedImage, setZoomedImage] = useState<WorkImage | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadImages()
  }, [userId])

  useEffect(() => {
    if (!selectedFiles.length) {
      setPreviews([])
      return
    }

    const urls = selectedFiles.map((file) => URL.createObjectURL(file))
    setPreviews(urls)

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [selectedFiles])

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

  function validateFiles(files: File[]) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    const maxSize = 10 * 1024 * 1024

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setError("Please select only JPEG, PNG, WebP, or GIF images.")
        return false
      }
      if (file.size > maxSize) {
        setError("Each file must be smaller than 10MB.")
        return false
      }
    }

    return true
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (!validateFiles(files)) {
      return
    }

    setSelectedFiles(files)
    setError(null)
  }

  async function handleUpload() {
    if (!selectedFiles.length) return

    setUploading(true)
    setError(null)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in to upload images")
        return
      }

      const formData = new FormData()
      selectedFiles.forEach((file) => formData.append("files", file))
      formData.append("title", title)
      formData.append("description", description)

      const res = await fetch("/api/work-images", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Upload failed")
      }

      const uploadedItems: WorkImage[] = Array.isArray(data.data)
        ? data.data
        : [data.data]

      setImages((prev) => [...uploadedItems, ...prev])
      cancelUpload()
      onUploadSuccess?.(uploadedItems[0])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(imageId: string) {
    if (!confirm("Are you sure you want to delete this image?")) return

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError("You must be logged in to delete images")
        return
      }

      const res = await fetch(`/api/work-images?id=${imageId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Delete failed")
      }

      setImages((prev) => prev.filter((img) => img.id !== imageId))
      onDeleteSuccess?.(imageId)
    } catch (err: any) {
      setError(err.message)
    }
  }

  function cancelUpload() {
    setSelectedFiles([])
    setPreviews([])
    setTitle("")
    setDescription("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Work Images
        </h3>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Click to select one or more images (JPEG, PNG, WebP, GIF)
          </p>
          <p className="text-xs text-gray-400 mt-1">Maximum size per file: 10MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-white/80">{selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected</p>
              <button
                type="button"
                onClick={cancelUpload}
                className="text-sm text-destructive hover:underline"
              >
                Clear selection
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {previews.map((preview, index) => (
                <div key={`${preview}-${index}`} className="rounded-lg border overflow-hidden">
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-28 object-cover" />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title (optional)</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Kitchen renovation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description (optional)</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the work done..."
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 flex-wrap">
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 1 ? 'Images' : 'Image'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={cancelUpload}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">
          My Work Images ({images.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : images.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No work images uploaded yet. Upload your first image above.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg overflow-hidden border cursor-pointer"
                onClick={() => {
                  setZoomedImage(image)
                  setZoomLevel(1)
                }}
              >
                <img
                  src={image.image_url}
                  alt={image.title || "Work image"}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-x-0 bottom-2 flex justify-end pr-2">
                  <div className="rounded-full bg-black/60 p-1 text-white">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                </div>
                <div className="p-2">
                  {image.title && (
                    <p className="font-medium text-sm truncate">{image.title}</p>
                  )}
                  {image.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {image.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(image.id)
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] w-full rounded-2xl bg-slate-950/95 p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                {zoomedImage.title && (
                  <h4 className="text-xl font-semibold">{zoomedImage.title}</h4>
                )}
                {zoomedImage.description && (
                  <p className="text-sm text-gray-300 mt-1">{zoomedImage.description}</p>
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
                src={zoomedImage.image_url}
                alt={zoomedImage.title || "Work image"}
                className="mx-auto block max-h-[70vh] object-contain"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            <button
              onClick={() => setZoomedImage(null)}
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
