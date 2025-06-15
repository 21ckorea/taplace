'use client'

import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, startOfDay, endOfDay, setHours, setMinutes, addMinutes, isToday, isPast } from 'date-fns'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
// import { CalendarIcon, ClockIcon, UsersIcon } from '@heroicons/react/24/outline' // Removed unused imports

interface Room {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
}

interface Reservation {
  id: string;
  room_id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  bookerName?: string;
}

export default function RoomDetailPage() {
  const router = useRouter()
  const { id: roomId } = useParams() as { id: string }
  const [room, setRoom] = useState<Room | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase: SupabaseClient = createClient()

  // 예약 폼 상태
  const [reservationTitle, setReservationTitle] = useState('')
  const [reservationDate, setReservationDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [reservationStartTime, setReservationStartTime] = useState('09:00')
  const [reservationEndTime, setReservationEndTime] = useState('10:00')
  const [attendees, setAttendees] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  const handleDurationChange = (minutes: number) => {
    const startDateTime = setMinutes(setHours(parseISO(reservationDate), parseInt(reservationStartTime.split(':')[0])), parseInt(reservationStartTime.split(':')[1]));
    const newEndDateTime = addMinutes(startDateTime, minutes);
    setReservationEndTime(format(newEndDateTime, 'HH:mm'));
  };

  useEffect(() => {
    async function fetchRoomAndReservations() {
      setLoading(true)
      setError(null)
      try {
        // 회의실 정보 가져오기
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single()

        if (roomError) {
          throw new Error(roomError.message)
        }
        setRoom(roomData as Room)

        // 해당 날짜의 예약 정보 가져오기
        const start = format(startOfDay(parseISO(reservationDate)), 'yyyy-MM-dd HH:mm:ssXXX')
        const end = format(endOfDay(parseISO(reservationDate)), 'yyyy-MM-dd HH:mm:ssXXX')

        const { data: reservationsData, error: reservationsError } = await supabase
          .from('reservations')
          .select('*, profiles(full_name)')
          .eq('room_id', roomId)
          .gte('start_time', start)
          .lte('end_time', end)
          .order('start_time')

        if (reservationsError) {
          throw new Error(reservationsError.message)
        }
        const formattedReservations = reservationsData.map((res: any) => ({
          ...res,
          bookerName: res.profiles?.full_name || '알 수 없음',
        })) as Reservation[]; // Explicitly cast to Reservation[]
        console.log("Formatted Reservations:", formattedReservations);
        setReservations(formattedReservations)

      } catch (err: unknown) {
        let message = '알 수 없는 오류가 발생했습니다.'
        if (err instanceof Error) {
          message = err.message
        } else if (typeof err === 'object' && err !== null && 'message' in err) {
          message = String((err as { message: unknown }).message)
        }
        setError(`데이터를 불러오는 중 오류가 발생했습니다: ${message}`)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (roomId) {
      fetchRoomAndReservations()
    }
  }, [roomId, reservationDate, supabase]) // Added supabase to dependency array

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitMessage(null)

    // 사용자 인증 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      setSubmitMessage(`사용자 세션 로드 중 오류가 발생했습니다: ${sessionError.message}`)
      setIsSubmitting(false)
      return
    }

    const user = session?.user

    if (!user) {
      setSubmitMessage('예약을 위해 로그인이 필요합니다.')
      setIsSubmitting(false)
      return
    }

    try {
      const startDateTime = setMinutes(setHours(parseISO(reservationDate), parseInt(reservationStartTime.split(':')[0])), parseInt(reservationStartTime.split(':')[1]))
      const endDateTime = setMinutes(setHours(parseISO(reservationDate), parseInt(reservationEndTime.split(':')[0])), parseInt(reservationEndTime.split(':')[1]))

      const now = new Date();
      // 예약 시작 시간이 현재 시간 이전인지 확인
      if (isToday(startDateTime) && isPast(startDateTime)) {
        setSubmitMessage('예약 시작 시간은 현재 시간 이후여야 합니다.');
        setIsSubmitting(false);
        return;
      }
      
      // 시간 유효성 검사
      if (startDateTime >= endDateTime) {
        setSubmitMessage('종료 시간은 시작 시간보다 늦어야 합니다.')
        setIsSubmitting(false)
        return
      }

      // 예약 충돌 확인
      const { data: conflictingReservations, error: conflictError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', roomId)
        .lt('start_time', endDateTime.toISOString())
        .gt('end_time', startDateTime.toISOString())

      if (conflictError) {
        throw new Error(conflictError.message)
      }

      if (conflictingReservations && conflictingReservations.length > 0) {
        setSubmitMessage('선택한 시간에 이미 예약이 존재합니다. 다른 시간을 선택해주세요.')
        setIsSubmitting(false)
        return
      }

      interface InsertReservation {
        room_id: string;
        user_id: string;
        title: string;
        start_time: string;
        end_time: string;
        attendees: string[];
      }

      const newReservation: InsertReservation = {
        room_id: roomId,
        user_id: user.id,
        title: reservationTitle,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        attendees: attendees.split(',').map(s => s.trim()),
      };

      const { data: _data, error: insertError } = await supabase // Renamed data to _data
        .from('reservations')
        .insert(newReservation)
        .select()

      if (insertError) { // Changed error to insertError
        throw new Error(insertError.message)
      }

      setSubmitMessage('예약이 성공적으로 완료되었습니다!')
      setReservationTitle('')
      setAttendees('')
      // 예약 성공 후 예약 목록 새로고침
      const start = format(startOfDay(parseISO(reservationDate)), 'yyyy-MM-dd HH:mm:ssXXX')
      const end = format(endOfDay(parseISO(reservationDate)), 'yyyy-MM-dd HH:mm:ssXXX')
      const { data: updatedReservations, error: updateError } = await supabase
        .from('reservations')
        .select('*')
        .eq('room_id', roomId)
        .gte('start_time', start)
        .lte('end_time', end)
        .order('start_time')
      
      if (updateError) throw new Error(updateError.message)
      setReservations(updatedReservations as Reservation[]) // Explicitly cast to Reservation[]

    } catch (err: unknown) {
      let message = '알 수 없는 오류가 발생했습니다.'
      if (err instanceof Error) {
        message = err.message
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        message = String((err as { message: unknown }).message)
      }
      setSubmitMessage(`예약 중 오류가 발생했습니다: ${message}`)
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">로딩 중...</p>
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

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">회의실을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{room.name} 예약</h1>
        
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">회의실 정보</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">회의실 이름</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{room.name}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">수용 인원</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{room.capacity}명</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">시설</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {room.facilities && room.facilities.length > 0 ? room.facilities.join(', ') : '없음'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 예약 폼 */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">회의실 예약</h2>
          <form onSubmit={handleReservationSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">예약 제목/회의 제목</label>
              <input
                type="text"
                id="title"
                value={reservationTitle}
                onChange={(e) => setReservationTitle(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">날짜</label>
                <input
                  type="date"
                  id="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  required
                  min={format(new Date(), 'yyyy-MM-dd')} // 오늘 날짜부터 선택 가능
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">시작 시간</label>
                <input
                  type="time"
                  id="startTime"
                  value={reservationStartTime}
                  onChange={(e) => {
                    setReservationStartTime(e.target.value);
                    const newStartDateTime = setMinutes(setHours(parseISO(reservationDate), parseInt(e.target.value.split(':')[0])), parseInt(e.target.value.split(':')[1]));
                    const currentEndDateTime = setMinutes(setHours(parseISO(reservationDate), parseInt(reservationEndTime.split(':')[0])), parseInt(reservationEndTime.split(':')[1]));
                    if (newStartDateTime >= currentEndDateTime) {
                      const defaultEndTime = addMinutes(newStartDateTime, 30);
                      setReservationEndTime(format(defaultEndTime, 'HH:mm'));
                    }
                  }}
                  required
                  min={isToday(parseISO(reservationDate)) ? format(new Date(), 'HH:mm') : '00:00'} // 오늘 날짜면 현재 시간부터, 아니면 00:00부터
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">종료 시간</label>
                <input
                  type="time"
                  id="endTime"
                  value={reservationEndTime}
                  onChange={(e) => setReservationEndTime(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            {/* 빠른 종료 시간 설정 */}
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                onClick={() => handleDurationChange(30)}
              >
                +30분
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                onClick={() => handleDurationChange(60)}
              >
                +60분
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                onClick={() => handleDurationChange(90)}
              >
                +90분
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
                onClick={() => handleDurationChange(120)}
              >
                +120분
              </button>
            </div>
            <div>
              <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">참석자 (쉼표로 구분)</label>
              <input
                type="text"
                id="attendees"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="예: 홍길동, 김철수"
              />
            </div>
            {submitMessage && (
              <p className={
                submitMessage.includes('성공적으로') ? 'text-green-600' : 'text-red-600'
              }>
                {submitMessage}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '예약 중...' : '예약하기'}
            </button>
          </form>
        </div>

        {/* 예약 현황 */}
        <div className="bg-white shadow overflow-hidden rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">예약 현황 ({reservationDate})</h2>
          {reservations.length === 0 ? (
            <p className="text-gray-500">예약된 시간이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {reservations.map((res) => (
                <li key={res.id} className="py-4">
                  <div className="flex space-x-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">{res.title}</h3>
                        <p className="text-sm text-gray-500">
                          {format(parseISO(res.start_time), 'HH:mm')} - {format(parseISO(res.end_time), 'HH:mm')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">예약자: {res.bookerName}</p>
                      {res.attendees && res.attendees.length > 0 && (
                        <p className="text-sm text-gray-500">참석자: {res.attendees.join(', ')}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
} 