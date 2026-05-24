import { useEffect, useState } from 'react'
import type { IntentTTLState } from '@/services/edge-case-handlers'
import { formatTTLCountdown, getTTLWarningLevel, getIntentTimeRemainingMs } from '@/services/edge-case-handlers'

interface TTLCountdownProps {
  ttlState: IntentTTLState
  onExpired?: () => void
  className?: string
}

export function TTLCountdown({ ttlState, onExpired, className = '' }: TTLCountdownProps) {
  const [remaining, setRemaining] = useState(() => {
    const now = Date.now()
    return getIntentTimeRemainingMs(ttlState, now)
  })
  const [warningLevel, setWarningLevel] = useState<'normal' | 'warning' | 'alert'>(() => {
    const now = Date.now()
    return getTTLWarningLevel(ttlState, now)
  })

  useEffect(() => {
    // If already expired
    const now = Date.now()
    const timeRemaining = getIntentTimeRemainingMs(ttlState, now)
    if (timeRemaining <= 0) {
      onExpired?.()
      return
    }

    // Update every second
    const interval = setInterval(() => {
      const currentTime = Date.now()
      const newRemaining = getIntentTimeRemainingMs(ttlState, currentTime)

      setRemaining(newRemaining)
      setWarningLevel(getTTLWarningLevel(ttlState, currentTime))

      if (newRemaining <= 0) {
        onExpired?.()
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [ttlState, onExpired])

  const formattedTime = formatTTLCountdown(remaining)

  const bgColor =
    warningLevel === 'alert'
      ? 'bg-red-50'
      : warningLevel === 'warning'
        ? 'bg-yellow-50'
        : 'bg-blue-50'

  const textColor =
    warningLevel === 'alert'
      ? 'text-red-700'
      : warningLevel === 'warning'
        ? 'text-yellow-700'
        : 'text-blue-700'

  const borderColor =
    warningLevel === 'alert'
      ? 'border-red-200'
      : warningLevel === 'warning'
        ? 'border-yellow-200'
        : 'border-blue-200'

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${bgColor} ${borderColor} ${className}`}
    >
      <span className={`text-sm font-medium ${textColor}`}>Complete booking in</span>
      <span className={`text-xl font-bold ${textColor}`}>{formattedTime}</span>
      {warningLevel === 'alert' && (
        <span className="text-xs font-semibold text-red-700">⚠️ Expiring soon</span>
      )}
    </div>
  )
}

/**
 * Minimal TTL indicator (just shows time remaining)
 */
export function TTLIndicator({ ttlState, className = '' }: Omit<TTLCountdownProps, 'onExpired'>) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const update = () => {
      const timeRemaining = getIntentTimeRemainingMs(ttlState, Date.now())
      setRemaining(Math.max(0, timeRemaining))
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [ttlState])

  const formattedTime = formatTTLCountdown(remaining)

  return <span className={`font-mono text-sm ${className}`}>{formattedTime}</span>
}
