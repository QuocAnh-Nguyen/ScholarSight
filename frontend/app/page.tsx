"use client"

import Link from "next/link"
import { useAuth } from "@/components/auth-provider"

export default function HomePage() {
  const { user, logout } = useAuth()

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-700">
            🎓 ScholarSight
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link href="/chat" className="text-sm text-gray-600 hover:text-primary-600">
                  Hỏi đáp
                </Link>
                <Link href="/probability" className="text-sm text-gray-600 hover:text-primary-600">
                  Đánh giá cơ hội
                </Link>
                <Link href="/roadmap" className="text-sm text-gray-600 hover:text-primary-600">
                  Lộ trình
                </Link>
                <span className="text-sm text-gray-500">👋 {user.full_name}</span>
                <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
              >
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Tư Vấn Tuyển Sinh{" "}
          <span className="text-primary-600">Thông Minh</span> Cho Học Sinh Việt Nam
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Dữ liệu chính xác từ các trường đại học • Đánh giá cơ hội trúng tuyển • Lộ
          trình cá nhân hóa
        </p>
        <div className="flex gap-4 justify-center">
          {user ? (
            <Link
              href="/chat"
              className="px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 shadow-lg"
            >
              Bắt đầu hỏi đáp →
            </Link>
          ) : (
            <>
              <Link
                href="/auth/register"
                className="px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 shadow-lg"
              >
                Đăng ký miễn phí
              </Link>
              <Link
                href="/auth/login"
                className="px-8 py-3 bg-white text-primary-600 rounded-xl font-semibold border border-primary-200 hover:bg-primary-50"
              >
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            emoji="💬"
            title="Hỏi đáp Tuyển sinh"
            description="Đặt câu hỏi về điểm chuẩn, phương thức xét tuyển, chỉ tiêu. Nhận câu trả lời kèm trích dẫn từ tài liệu gốc."
          />
          <FeatureCard
            emoji="📊"
            title="Đánh giá Cơ hội"
            description="Nhập điểm của bạn và nhận đánh giá 🟢 An toàn / 🟡 Mục tiêu / 🔴 Thách thức dựa trên dữ liệu lịch sử."
          />
          <FeatureCard
            emoji="📋"
            title="Lộ trình Cá nhân"
            description="Quản lý tiến độ ôn thi và nộp hồ sơ với Kanban to-do list được cá nhân hóa theo từng tháng."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureCard({
  emoji,
  title,
  description,
}: {
  emoji: string
  title: string
  description: string
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{emoji}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}