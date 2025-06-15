'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useNotification } from '@/context/NotificationContext'

export default function Navbar() {
  const supabase = createClient()
  const router = useRouter()
  const { showNotification } = useNotification()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleSignOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) {
      showNotification(`로그아웃 실패: ${error.message}`, 'error')
    } else {
      showNotification('로그아웃 성공!', 'success')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <nav className="bg-gray-800 p-4 sticky top-0 z-40">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-white text-2xl font-bold">
          홈
        </Link>
        <div className="flex space-x-4">
          <Link href="/rooms" className="text-gray-300 hover:text-white">
            회의실 예약
          </Link>
          <Link href="/schedules" className="text-gray-300 hover:text-white">
            회의실 전체 일정
          </Link>
          {user ? (
            <>
              <Link href="/my-reservations" className="text-gray-300 hover:text-white">
                내 예약
              </Link>
              {/* 관리자 확인 (예시: user.email === 'admin@example.com' 또는 role 기반) */}
              {user && user.email === 'admin@example.com' && (
                <Link href="/admin/rooms" className="text-gray-300 hover:text-white">
                  회의실 관리
                </Link>
              )}
              <button
                onClick={handleSignOut}
                disabled={loading}
                className="text-gray-300 hover:text-white disabled:opacity-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link href="/login" className="text-gray-300 hover:text-white">
              로그인 / 회원가입
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
} 