import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function getRooms() {
  const supabase = createServerClient()
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*, facilities')
    .order('capacity', { ascending: false })
  
  if (error) {
    console.error('Error fetching rooms:', error)
    return []
  }
  
  return rooms
}

export default async function RoomsPage() {
  const rooms = await getRooms()

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">회의실 목록</h1>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room: any) => (
            <div
              key={room.id}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  수용 인원: {room.capacity}명
                </p>
                {room.facilities && room.facilities.length > 0 && (
                  <p className="mt-1 text-sm text-gray-500">
                    시설: {room.facilities.join(', ')}
                  </p>
                )}
                <div className="mt-4">
                  <Link
                    href={`/rooms/${room.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    예약하기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 