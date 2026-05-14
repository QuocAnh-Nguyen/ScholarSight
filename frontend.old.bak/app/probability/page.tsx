"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import Link from "next/link"
import toast from "react-hot-toast"

export default function ProbabilityPage() {
  const [score, setScore] = useState("")
  const [university, setUniversity] = useState("")
  const [major, setMajor] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const universities = [
    "Trường Đại học Bách khoa Hà Nội",
    "Trường Đại học Kinh tế Quốc dân",
    "Trường Đại học Ngoại thương",
  ]

  const handleAssess = async () => {
    if (!score || !university || !major) { toast.error("Fill all fields"); return }
    setLoading(true)
    try {
      const res = await api.post("/probability/assess", {
        score: parseFloat(score), university, major, admission_method: "regular",
      })
      setResult(res.data)
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-primary-700">ScholarSight</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/chat" className="text-gray-600 hover:text-primary-600">Chat</Link>
          <Link href="/roadmap" className="text-gray-600 hover:text-primary-600">Roadmap</Link>
        </div>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Admission Probability</h1>
        <p className="text-gray-500 mb-8">Enter your score and preferences.</p>
        <div className="bg-white rounded-2xl border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Score</label>
            <input type="number" step="0.25" value={score} onChange={e => setScore(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">University</label>
            <select value={university} onChange={e => setUniversity(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg">
              <option value="">-- Select --</option>
              {universities.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Major</label>
            <input value={major} onChange={e => setMajor(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg" placeholder="e.g. Computer Science" />
          </div>
          <button onClick={handleAssess} disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold">
            {loading ? "Assessing..." : "Assess"}
          </button>
        </div>
        {result && (
          <div className="mt-8 bg-white rounded-2xl border p-6">
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{result.tier.emoji}</div>
              <div className="text-2xl font-bold">{result.tier.label}</div>
              <div className="text-sm text-gray-500">Percentile: {result.tier.percentile_rank}%</div>
            </div>
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm"><span>Your score</span><span className="font-semibold">{result.competitive_map.candidate_score}</span></div>
              <div className="flex justify-between text-sm"><span>Cutoff</span><span className="font-semibold">{result.competitive_map.cutoff_score}</span></div>
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Historical Cutoffs</h4>
                {result.competitive_map.historical_years.map((y: any) => (
                  <div key={y.year} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded">
                    <span>{y.year}</span><span className="font-medium">{y.cutoff_score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
