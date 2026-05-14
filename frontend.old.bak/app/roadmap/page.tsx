"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import Link from "next/link"
import toast from "react-hot-toast"

interface Task {
  id: string; title: string; description: string | null
  status: "todo" | "in_progress" | "done"; due_month: number | null; category: string | null
}

const COLS = [
  { key: "todo", label: "To Do", bg: "bg-gray-100" },
  { key: "in_progress", label: "In Progress", bg: "bg-blue-100" },
  { key: "done", label: "Done", bg: "bg-green-100" },
]
const M: Record<number, string> = {1:"Jan",2:"Feb",3:"Mar",4:"Apr",5:"May",6:"Jun",7:"Jul",8:"Aug",9:"Sep",10:"Oct",11:"Nov",12:"Dec"}

export default function RoadmapPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [fm, setFM] = useState<number | null>(null)
  const [nt, setNT] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const p: Record<string, string> = {}
      if (fm) p.month = fm.toString()
      setTasks((await api.get("/roadmap/tasks", { params: p })).data)
    } catch { toast.error("Load error") } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const mv = async (id: string, s: string) => {
    try {
      await api.put(`/roadmap/tasks/${id}`, { status: s })
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: s as Task["status"] } : t))
    } catch { toast.error("Error") }
  }

  const create = async () => {
    if (!nt.trim()) return
    try {
      const r = await api.post("/roadmap/tasks", { title: nt, status: "todo", due_month: fm, sort_order: tasks.length })
      setTasks(prev => [...prev, r.data]); setNT(""); setShow(false)
    } catch { toast.error("Error") }
  }

  const del = async (id: string) => {
    try { await api.delete(`/roadmap/tasks/${id}`); setTasks(prev => prev.filter(t => t.id !== id)) }
    catch { toast.error("Error") }
  }

  const bs = (s: string) => tasks.filter(t => t.status === s)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-primary-700">ScholarSight</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/chat" className="text-gray-600 hover:text-primary-600">Chat</Link>
          <Link href="/probability" className="text-gray-600 hover:text-primary-600">Assess</Link>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between mb-6">
          <div><h1 className="text-2xl font-bold">Personal Roadmap</h1></div>
          <button onClick={() => setShow(true)} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">+ Add</button>
        </div>
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => { setFM(null); load() }} className={`px-3 py-1 rounded-full text-xs ${!fm ? "bg-primary-600 text-white" : "bg-gray-200"}`}>All</button>
          {Array.from({length:12},(_,i)=>i+1).map(m => (
            <button key={m} onClick={() => { setFM(m); load() }} className={`px-3 py-1 rounded-full text-xs ${fm===m ? "bg-primary-600 text-white" : "bg-gray-200"}`}>{M[m]}</button>
          ))}
        </div>
        {show && (
          <div className="mb-6 bg-white border rounded-xl p-4 flex gap-3">
            <input value={nt} onChange={e => setNT(e.target.value)}
              placeholder="Task..." className="flex-1 px-3 py-2 border rounded-lg text-sm"
              onKeyDown={e => e.key === "Enter" && create()} />
            <button onClick={create} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Add</button>
            <button onClick={() => setShow(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
          </div>
        )}
        {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
          <div className="grid md:grid-cols-3 gap-6">
            {COLS.map(col => (
              <div key={col.key} className={`${col.bg} rounded-2xl p-4 min-h-[200px]`}>
                <h3 className="font-semibold text-sm mb-4">{col.label} ({bs(col.key).length})</h3>
                <div className="space-y-3">
                  {bs(col.key).map(t => (
                    <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border">
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                      <div className="flex gap-2 mt-3">
                        {t.due_month && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{M[t.due_month]}</span>}
                        {t.category && <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">{t.category}</span>}
                      </div>
                      <div className="flex gap-1 mt-3">
                        {col.key!=="todo" && <button onClick={()=>mv(t.id,"todo")} className="text-xs text-gray-500">←</button>}
                        {col.key!=="in_progress" && <button onClick={()=>mv(t.id,"in_progress")} className="text-xs text-blue-600">→</button>}
                        {col.key!=="done" && <button onClick={()=>mv(t.id,"done")} className="text-xs text-green-600">✓</button>}
                        <button onClick={()=>del(t.id)} className="text-xs text-red-400 ml-auto">Del</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
