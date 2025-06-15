'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Room {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
}

export default function AdminRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomCapacity, setNewRoomCapacity] = useState<number | ''>('')
  const [newRoomFacilities, setNewRoomFacilities] = useState('')
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('rooms')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) {
        throw new Error(fetchError.message)
      }
      setRooms(data as Room[])
    } catch (err: any) {
      setError(`회의실 목록을 불러오는 중 오류가 발생했습니다: ${err.message}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!newRoomName || newRoomCapacity === '') {
      setError('회의실 이름과 수용 인원은 필수입니다.')
      setIsSubmitting(false)
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('rooms')
        .insert({
          name: newRoomName,
          capacity: newRoomCapacity,
          facilities: newRoomFacilities.split(',').map(f => f.trim()).filter(f => f),
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      setNewRoomName('')
      setNewRoomCapacity('')
      setNewRoomFacilities('')
      await fetchRooms() // 목록 새로고침
      alert('회의실이 성공적으로 생성되었습니다.')
    } catch (err: any) {
      setError(`회의실 생성 중 오류가 발생했습니다: ${err.message}`)
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setNewRoomName(room.name)
    setNewRoomCapacity(room.capacity)
    setNewRoomFacilities(room.facilities ? room.facilities.join(', ') : '')
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!editingRoom || !newRoomName || newRoomCapacity === '') {
      setError('편집할 회의실과 이름, 수용 인원은 필수입니다.')
      setIsSubmitting(false)
      return
    }

    try {
      const { data, error: updateError } = await supabase
        .from('rooms')
        .update({
          name: newRoomName,
          capacity: newRoomCapacity,
          facilities: newRoomFacilities.split(',').map(f => f.trim()).filter(f => f),
        })
        .eq('id', editingRoom.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(updateError.message)
      }

      setEditingRoom(null)
      setNewRoomName('')
      setNewRoomCapacity('')
      setNewRoomFacilities('')
      await fetchRooms() // 목록 새로고침
      alert('회의실이 성공적으로 업데이트되었습니다.')
    } catch (err: any) {
      setError(`회의실 업데이트 중 오류가 발생했습니다: ${err.message}`)
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('정말로 이 회의실을 삭제하시겠습니까? 관련 예약 내역도 삭제됩니다.')) {
      return
    }

    try {
      const { error: deleteError } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      await fetchRooms() // 목록 새로고침
      alert('회의실이 성공적으로 삭제되었습니다.')
    } catch (err: any) {
      setError(`회의실 삭제 중 오류가 발생했습니다: ${err.message}`)
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">회의실 목록 로딩 중...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">회의실 관리</h1>

        {/* 회의실 생성/수정 폼 */}
        <div className="bg-white shadow overflow-hidden rounded-lg mb-8 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {editingRoom ? '회의실 수정' : '새 회의실 추가'}
          </h2>
          <form onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom} className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700">회의실 이름</label>
              <input
                type="text"
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="roomCapacity" className="block text-sm font-medium text-gray-700">수용 인원</label>
              <input
                type="number"
                id="roomCapacity"
                value={newRoomCapacity}
                onChange={(e) => setNewRoomCapacity(parseInt(e.target.value) || '')}
                required
                min="1"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="roomFacilities" className="block text-sm font-medium text-gray-700">시설 (쉼표로 구분)</label>
              <input
                type="text"
                id="roomFacilities"
                value={newRoomFacilities}
                onChange={(e) => setNewRoomFacilities(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="예: 프로젝터, 화이트보드, TV"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : (editingRoom ? '회의실 업데이트' : '회의실 추가')}
              </button>
              {editingRoom && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRoom(null)
                    setNewRoomName('')
                    setNewRoomCapacity('')
                    setNewRoomFacilities('')
                  }}
                  className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  취소
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 회의실 목록 */}
        <div className="bg-white shadow overflow-hidden rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">현재 회의실</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500">등록된 회의실이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {rooms.map((room) => (
                <li key={room.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                    <p className="text-gray-600">수용 인원: {room.capacity}명</p>
                    <p className="text-gray-600">시설: {room.facilities && room.facilities.length > 0 ? room.facilities.join(', ') : '없음'}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleEditRoom(room)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDeleteRoom(room.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      삭제
                    </button>
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