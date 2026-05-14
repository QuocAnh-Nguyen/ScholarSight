"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import Link from "next/link"
import toast from "react-hot-toast"

interface Batch {
  id: string
  source_file: string
  status: string
  total_pages: number | null
  processed_pages: number
  error_message: string | null
}

export default function AdminPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [uploading, setUploading] = useState(false)

  const loadBatches = async () => {
    try {
      const res = await api.get("/ingest/batches")
      setBatches(res.data)
    } catch { toast.error("Cannot load batches") }
  }

  useEffect(() => { loadBatches() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".pdf")) { toast.error("Only PDF files"); return }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      await api.post("/ingest/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      toast.success("Uploaded! Processing started.")
      loadBatches()
    } catch { toast.error("Upload failed") }
    finally { setUploading(false) }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-primary-700">ScholarSight Admin</Link>
        <Link href="/" className="text-sm text-gray-600">← Back</Link>
      </header>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Data Ingestion</h1>
            <p className="text-gray-500 text-sm">Upload admission PDFs for RAG processing</p>
          </div>
          <label className={`px-4 py-2 bg-primary-600 text-white rounded-lg text-sm cursor-pointer hover:bg-primary-700 ${uploading ? "opacity-50" : ""}`}>
            {uploading ? "Uploading..." : "+ Upload PDF"}
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">File</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Pages</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Error</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">No documents uploaded yet</td></tr>
              )}
              {batches.map(b => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{b.source_file}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(b.status)}`}>{b.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{b.processed_pages}/{b.total_pages || "?"}</td>
                  <td className="px-4 py-3 text-red-500 text-xs">{b.error_message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
