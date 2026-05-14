"use client"

import { useState, useRef, useEffect } from "react"
import { api } from "@/lib/api"
import Link from "next/link"
import toast from "react-hot-toast"

interface Message {
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  humanFallback?: boolean
}

interface Citation {
  doc_id: string
  component_type: string
  summary: string
  image_url?: string | null
  cosine_score: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [showCitation, setShowCitation] = useState<Citation | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const userMsg: Message = { role: "user", content: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)
    try {
      const res = await api.post("/query", { query: input })
      setMessages(prev => [...prev, {
        role: "assistant", content: res.data.answer,
        citations: res.data.citations, humanFallback: res.data.human_fallback,
      }])
    } catch { toast.error("Cannot process query.") }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-primary-700">ScholarSight</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/probability" className="text-gray-600 hover:text-primary-600">Assess</Link>
          <Link href="/roadmap" className="text-gray-600 hover:text-primary-600">Roadmap</Link>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg">Ask admissions questions</p>
            <p className="text-sm mt-2">E.g. "What is the cutoff for CS at HUST 2023?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${msg.role === "user" ? "bg-primary-600 text-white" : msg.humanFallback ? "bg-yellow-50 border border-yellow-200" : "bg-white border"}`}>
              <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cit, j) => (
                      <button key={j} onClick={() => setShowCitation(cit)}
                        className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded">
                        Source ({(cit.cosine_score * 100).toFixed(0)}%)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="bg-white border rounded-2xl px-4 py-3"><span className="animate-pulse">Thinking...</span></div></div>}
        <div ref={bottomRef} />
      </div>
      <div className="bg-white border-t px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask about admissions..." disabled={loading}
            className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 text-sm" />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium">Send</button>
        </div>
      </div>
      {showCitation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCitation(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">Source</h3>
            <p className="text-sm text-gray-800 mb-4">{showCitation.summary}</p>
            {showCitation.image_url && <img src={showCitation.image_url} alt="Source" className="w-full rounded-lg" />}
            <button onClick={() => setShowCitation(null)} className="mt-4 w-full py-2 bg-gray-100 rounded-lg">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
