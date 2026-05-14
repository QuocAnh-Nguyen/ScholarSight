"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api } from "@/lib/api"

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")
    if (storedToken) {
      setToken(storedToken)
      fetchUser(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setUser(res.data)
    } catch {
      localStorage.removeItem("token")
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password })
    const { access_token } = res.data
    localStorage.setItem("token", access_token)
    setToken(access_token)
    await fetchUser(access_token)
  }

  const register = async (email: string, password: string, fullName: string) => {
    const res = await api.post("/auth/register", {
      email,
      password,
      full_name: fullName,
    })
    const { access_token } = res.data
    localStorage.setItem("token", access_token)
    setToken(access_token)
    await fetchUser(access_token)
  }

  const logout = () => {
    localStorage.removeItem("token")
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}