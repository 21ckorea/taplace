'use client'

import { useEffect, useState } from 'react'
import { XCircleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Notification({ message, type, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onClose()
    }, 5000) // 5초 후에 자동으로 사라짐

    return () => clearTimeout(timer)
  }, [onClose])

  const bgColor = type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50'
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800'
  const iconColor = type === 'success' ? 'text-green-400' : type === 'error' ? 'text-red-400' : 'text-blue-400'
  const Icon = type === 'success' ? CheckCircleIcon : type === 'error' ? XCircleIcon : InformationCircleIcon

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-x-0 top-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50`}
    >
      <div
        className={`max-w-sm w-full ${bgColor} shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
            </div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${textColor}`}>
                {message}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                type="button"
                className={`rounded-md ${bgColor} inline-flex ${textColor} hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                onClick={() => {
                  setIsVisible(false)
                  onClose()
                }}
              >
                <span className="sr-only">Close</span>
                <XCircleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 