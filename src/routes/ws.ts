import { useEffect, useState } from 'react'

type ConnectionState = 'connecting' | 'open' | 'closed' | 'error'

type TimeSeriesPoint = {
  time: number
  amplitude: number
}

type FrequencyPoint = {
  freq: string
  energy: number
}

type SensorDataPayload = {
  timestamp?: string
  receivedAt?: string
  flowRate?: number
  debit?: number
  totalHead?: number
  head?: number
  rpm?: number
  fuelLevel?: number
  fuel_level?: number
  fuel?: number
  levelBbm?: number
  level_bbm?: number
  coolantTemperature?: number
  coolantTemp?: number
  suhuPendingin?: number
  suhu_pendingin?: number
  oilPressure?: number
  oil_pressure?: number
  timeSeries?: Array<TimeSeriesPoint>
  fft?: Array<FrequencyPoint>
  [key: string]: unknown
}

type SensorSocketMessage = {
  type: 'sensor:update'
  payload: SensorDataPayload
}

export function useWebSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [latestSensorData, setLatestSensorData] = useState<SensorDataPayload | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [reconnectSignal, setReconnectSignal] = useState(0)

  const handleManualReconnect = () => {
    setConnectionState('connecting')
    setConnectionError(null)
    setReconnectSignal((prev) => prev + 1)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let isDisposed = false

    const resolveWebSocketUrl = () => {
      const explicit = (import.meta.env.VITE_SENSOR_WS_URL ?? '').trim()
      if (explicit.length > 0) {
        // If explicit URL starts with http://, convert to ws://
        // If starts with https://, convert to wss://
        if (explicit.startsWith('http://')) {
          return 'ws://' + explicit.slice(7)
        } else if (explicit.startsWith('https://')) {
          return 'wss://' + explicit.slice(8)
        }
        return explicit
      }

      const portOverride = (import.meta.env.VITE_SENSOR_WS_PORT ?? '').trim()
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

      if (portOverride.length > 0) {
        const hostname = window.location.hostname
        return `${protocol}//${hostname}:${portOverride}`
      }

      return `${protocol}//${window.location.host}/ws`
    }

    const scheduleReconnect = () => {
      if (isDisposed) return
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      reconnectTimer = window.setTimeout(connect, 3_000)
    }

    const connect = () => {
      if (isDisposed) return

      const url = resolveWebSocketUrl()
      setConnectionState('connecting')
      setConnectionError(null)

      try {
        socket = new WebSocket(url)
      } catch (error) {
        console.error('WebSocket initialization failed:', error)
        setConnectionState('error')
        setConnectionError(
          error instanceof Error ? error.message : 'Tidak bisa membuka koneksi WebSocket',
        )
        scheduleReconnect()
        return
      }

      socket.addEventListener('open', () => {
        if (isDisposed) return
        setConnectionState('open')
        setConnectionError(null)
      })

      socket.addEventListener('message', (event) => {
        if (isDisposed) return
        try {
          const data = JSON.parse(event.data) as SensorSocketMessage
          if (data?.type === 'sensor:update' && data.payload) {
            setLatestSensorData(data.payload)
          }
        } catch (error) {
          console.error('Failed to parse sensor message:', error)
        }
      })

      socket.addEventListener('close', (event) => {
        if (isDisposed) return
        setConnectionState('closed')
        setConnectionError(event.reason || 'Koneksi WebSocket ditutup. Mencoba ulang...')
        scheduleReconnect()
      })

      socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event)
        setConnectionState('error')
        setConnectionError('Gangguan koneksi WebSocket. Mencoba ulang...')
        socket?.close()
      })
    }

    connect()

    return () => {
      isDisposed = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
  }, [reconnectSignal])

  return {
    connectionState,
    latestSensorData,
    connectionError,
    handleManualReconnect,
  }
}