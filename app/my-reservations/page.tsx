'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface Reservation {
  id: string;
  room_id: string;
  title: string;
  start_time: string;
  end_time: string;
  rooms: { name: string; facilities?: string[] } | null; // facilities 추가
}

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Define the custom order for rooms
  const roomOrder = ['대회의실', '1회의실', '2회의실'];

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('정말로 이 예약을 취소하시겠습니까?')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservationId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      setReservations(prevReservations =>
        prevReservations.filter(res => res.id !== reservationId)
      )
      alert('예약이 성공적으로 취소되었습니다.')
    } catch (err: any) {
      alert(`예약 취소 중 오류가 발생했습니다: ${err.message}`)
      console.error(err)
    }
  }

  useEffect(() => {
    async function fetchReservations() {
      setLoading(true)
      setError(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setError('로그인이 필요합니다.')
          setLoading(false)
          return
        }

        const { data: reservationsData, error: fetchError } = await supabase
          .from('reservations')
          .select(`
            id,
            room_id,
            title,
            start_time,
            end_time,
            rooms ( name, facilities ) // facilities 추가
          `)
          .eq('user_id', user.id)
          .order('start_time', { ascending: false })

        if (fetchError) {
          throw new Error(fetchError.message)
        }

        let sortedReservations = (reservationsData as unknown as Reservation[]);

        // Custom sorting logic
        sortedReservations.sort((a, b) => {
          const nameA = a.rooms?.name || '';
          const nameB = b.rooms?.name || '';

          const indexA = roomOrder.indexOf(nameA);
          const indexB = roomOrder.indexOf(nameB);

          // If both are in the custom order, sort by their index
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only A is in the custom order, A comes first
          if (indexA !== -1) {
            return -1;
          }
          // If only B is in the custom order, B comes first
          if (indexB !== -1) {
            return 1;
          }
          // If neither are in the custom order, sort alphabetically by name
          return nameA.localeCompare(nameB);
        });

        setReservations(sortedReservations)

      } catch (err: any) {
        setError(`예약 내역을 불러오는 중 오류가 발생했습니다: ${err.message}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchReservations()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">예약 내역 로딩 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">오류: {error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">나의 예약 내역</h1>
        
        {reservations.length === 0 ? (
          <p className="text-gray-500">예약 내역이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {reservations.map((reservation) => {
              return (
                <li key={reservation.id} className="bg-white shadow overflow-hidden rounded-lg p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{reservation.title}</h2>
                      <p className="text-gray-600">회의실: {reservation.rooms?.name}</p>
                      {reservation.rooms?.facilities && reservation.rooms.facilities.length > 0 && (
                        <p className="text-gray-600 text-sm">
                          시설: {reservation.rooms.facilities.join(', ')}
                        </p>
                      )}
                      <p className="text-gray-600">
                        시간: {format(parseISO(reservation.start_time), 'yyyy년 MM월 dd일 HH:mm')} - {format(parseISO(reservation.end_time), 'HH:mm')}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <Link
                        href={`/rooms/${reservation.room_id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        상세 보기
                      </Link>
                      <button
                        onClick={() => handleCancelReservation(reservation.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        예약 취소
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
} 