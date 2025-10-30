import { useEffect, useState } from 'react'
import { createServerFn } from '@tanstack/react-start'

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
  const [wsUrl, setWsUrl] = useState<string | null>(null)

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

    // Fetch the WS URL from server on mount
    const fetchWsUrl = async () => {
      try {
        const url = await getSensorWsUrl()
        if (!isDisposed) {
          setWsUrl(url)
        }
      } catch (error) {
        console.error('Failed to get WebSocket URL:', error)
        if (!isDisposed) {
          setConnectionError('Gagal mengambil URL WebSocket')
        }
      }
    }

    fetchWsUrl()

    const scheduleReconnect = () => {
      if (isDisposed) return
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      reconnectTimer = window.setTimeout(connect, 3_000)
    }

    const connect = () => {
      if (isDisposed || !wsUrl) return

      setConnectionState('connecting')
      setConnectionError(null)

      try {
        socket = new WebSocket(wsUrl)
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

    // Connect setelah wsUrl diterima
    if (wsUrl) {
      connect()
    }

    return () => {
      isDisposed = true
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer)
      }
      socket?.close()
    }
  }, [reconnectSignal, wsUrl])

  return {
    connectionState,
    latestSensorData,
    connectionError,
    handleManualReconnect,
  }
}

export const getSensorWsUrl = createServerFn({ method: 'GET' }).handler(async () => {
  const explicit = (process.env.SENSOR_WS_URL ?? '').toString().trim()

  if (explicit.length > 0) {
    // Convert http/https to ws/wss if needed
    if (explicit.startsWith('http://')) {
      return 'ws://' + explicit.slice(7)
    } else if (explicit.startsWith('https://')) {
      return 'wss://' + explicit.slice(8)
    }
    return explicit
  }

  // Fallback: return default path
  return 'ws://localhost:3000/ws'
})