'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View, NavigateAction } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

// Custom Toolbar Component
interface CustomToolbarProps {
  label: string;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  // Add other props if needed that are passed to the toolbar
}

const CustomToolbar: React.FC<CustomToolbarProps> = ({ label, onNavigate }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <button
        onClick={() => onNavigate('PREV')}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        이전 날짜
      </button>
      <h2 className="text-xl font-semibold text-black">{label}</h2>
      <button
        onClick={() => onNavigate('NEXT')}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        다음 날짜
      </button>
    </div>
  );
};

// date-fns 로컬라이저 설정
const locales = {
  'ko': ko,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const DragAndDropCalendar = withDragAndDrop<CalendarEvent, Resource>(Calendar)

interface Room {
  id: string;
  name: string;
  capacity: number;
  facilities: string[];
}

interface RawReservationResponse {
  id: string;
  room_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: string[];
  rooms: { id: string; name: string; capacity: number; facilities: string[] } | null;
}

interface CalendarEvent {
  id: string;
  title: string; // Displayed title (e.g., "예약됨")
  originalTitle: string; // Actual title
  start: Date;
  end: Date;
  allDay?: boolean;
  resourceId?: string; // resourceId 추가
}

interface Resource {
  id: string;
  title: string;
}

export default function SchedulesPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date()) // 선택된 날짜 상태 추가
  const supabase = createClient()

  const fetchAllRoomsAndReservations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 모든 회의실 정보 가져오기
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, name, capacity, facilities')
        .order('capacity', { ascending: false })

      if (roomsError) {
        throw new Error(roomsError.message)
      }
      setRooms(roomsData as Room[])

      // 선택된 날짜의 예약 정보 가져오기
      const startOfSelectedDay = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssXXX");
      const endOfSelectedDay = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ssXXX");

      const { data: reservationsData, error: reservationsError } = await supabase
        .from('reservations')
        .select('*, rooms(id, name, capacity, facilities)')
        .gte('start_time', startOfSelectedDay)
        .lt('start_time', endOfSelectedDay) // start_time이 선택된 날짜 안에 있는 것만 가져옵니다.
        .order('start_time', { ascending: true })

      if (reservationsError) {
        throw new Error(reservationsError.message)
      }

      const formattedEvents: CalendarEvent[] = (reservationsData as RawReservationResponse[]).map(res => ({
        id: res.id,
        title: '예약됨',
        originalTitle: `${res.rooms?.name ? `[${res.rooms.name}] ` : ''}${res.title}`,
        start: new Date(res.start_time),
        end: new Date(res.end_time),
        allDay: false,
        resourceId: res.room_id, // resourceId 추가
      }));

      setEvents(formattedEvents)

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
  }, [selectedDate, setLoading, setError, setRooms, setEvents, supabase]) // Add all dependencies

  useEffect(() => {
    fetchAllRoomsAndReservations()
  }, [fetchAllRoomsAndReservations])

  const roomResources: Resource[] = rooms.map(room => ({
    id: room.id,
    title: room.name,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">일정 로딩 중...</p>
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">회의실 전체 일정</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <DragAndDropCalendar
            localizer={localizer}
            events={events}
            resources={roomResources} // 리소스 추가
            resourceIdAccessor={(resource: Resource) => resource.id} // 리소스 ID 접근자
            resourceTitleAccessor={(resource: Resource) => resource.title} // 리소스 제목 접근자
            startAccessor={(event: CalendarEvent) => event.start}
            endAccessor={(event: CalendarEvent) => event.end}
            min={new Date(new Date().setHours(8, 0, 0))}
            max={new Date(new Date().setHours(19, 0, 0))}
            style={{ height: 700 }}
            selectable
            resizable
            defaultView="day" // 기본 뷰를 day로 설정
            views={['day']} // day 뷰만 표시
            date={selectedDate} // 현재 선택된 날짜로 달력의 날짜 설정
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            onNavigate={(newDate: Date, view?: View, action?: NavigateAction) => setSelectedDate(newDate)} // 날짜 변경 시 setSelectedDate 직접 호출
            culture="ko"
            messages={{
              next: '다음',
              previous: '이전',
              today: '오늘',
              month: '월',
              week: '주',
              day: '일',
              date: '날짜',
              time: '시간',
              event: '이벤트',
              allDay: '종일',
              noEventsInRange: '해당 기간에 예약된 일정이 없습니다.',
            }}
            components={{
              toolbar: CustomToolbar,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSelectEvent={(event: CalendarEvent) => alert(event.originalTitle)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onSelectSlot={(slotInfo: any) => {
              console.log('Selected slot:', slotInfo);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onEventDrop={(args: any) => {
              console.log('Event dropped:', args);
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onEventResize={(args: any) => {
              console.log('Event resized:', args);
            }}
          />
        </div>
      </div>
    </div>
  )
}