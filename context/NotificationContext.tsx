'use client'

import React, { createContext, useState, useContext, useCallback } from 'react'
import Notification from '@/components/Notification'

interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface NotificationContextType {
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([])

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() // Unique ID for each notification
    setNotifications((prevNotifications) => [...prevNotifications, { id, message, type }])
  }, [])

  const handleCloseNotification = useCallback((id: string) => {
    setNotifications((prevNotifications) =>
      prevNotifications.filter((notification) => notification.id !== id)
    )
  }, [])

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed bottom-0 right-0 p-4 space-y-2 z-50">
        {notifications.map((notification) => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => handleCloseNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
} 