"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import toast from "react-hot-toast"

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const { login, register } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)

  const isLogin = mode === "login"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(email, password, fullName)
      }
      toast.success(isLogin ? "Đăng nhập thành công!" : "Đăng ký thành công!")
      router.push("/")
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Có lỗi xảy ra. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">🎓 ScholarSight</h1>
          <p className="text-gray-500 mt-2">
            {isLogin ? "Đăng nhập để tiếp tục" : "Tạo tài khoản mới"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
                placeholder="Nguyễn Văn A"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
              minLength={6}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? (
            <>
              Chưa có tài khoản?{" "}
              <Link href="/auth/register" className="text-primary-600 hover:underline">
                Đăng ký
              </Link>
            </>
          ) : (
            <>
              Đã có tài khoản?{" "}
              <Link href="/auth/login" className="text-primary-600 hover:underline">
                Đăng nhập
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  )
}