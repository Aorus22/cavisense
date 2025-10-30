import { WebSocketServer, WebSocket } from 'ws'
import { Server as HttpServer } from 'http'
import Redis from 'ioredis'

export type SensorPayload = {
  receivedAt: string
  [key: string]: unknown
}

const SENSOR_REDIS_KEY = process.env.REDIS_SENSOR_KEY ?? 'sensor:latest'

const redis = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
})

const connectedClients = new Set<WebSocket>()

// Setup WebSocket server on existing HTTP server
let wss: WebSocketServer

// Setup function to initialize WebSocket on existing HTTP server
function setupWebSocketConnections() {
  // WebSocket connections
  wss.on('connection', (socket) => {
    console.log('[websocket] Client connected')
    connectedClients.add(socket)

    // Send latest sensor data on connection
    getLatestSensorPayload().then((latest) => {
      if (latest && socket.readyState === WebSocket.OPEN) {
        socket.send(createSensorMessage(latest))
      }
    })

    socket.on('close', () => {
      console.log('[websocket] Client disconnected')
      connectedClients.delete(socket)
    })

    socket.on('error', (error) => {
      console.error('[websocket] Client error:', error)
      connectedClients.delete(socket)
    })
  })
}

export function broadcastSensorUpdate(payload: SensorPayload) {
  if (!connectedClients.size) {
    return
  }

  const message = createSensorMessage(payload)

  for (const socket of connectedClients) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(message)
      } catch (error) {
        connectedClients.delete(socket)
        console.error('[websocket] Failed to deliver update:', error)
      }
    } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      connectedClients.delete(socket)
    }
  }
}

function createSensorMessage(payload: SensorPayload): string {
  return JSON.stringify({
    type: 'sensor:update',
    payload,
  })
}

export async function persistLatestSensorPayload(payload: SensorPayload) {
  try {
    await redis.set(SENSOR_REDIS_KEY, JSON.stringify(payload))
    console.log('[websocket] Sensor data persisted')
  } catch (error) {
    console.error('[websocket] Failed to persist sensor payload:', error)
  }
}

export async function getLatestSensorPayload(): Promise<SensorPayload | null> {
  try {
    const raw = await redis.get(SENSOR_REDIS_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as SensorPayload
  } catch (error) {
    console.error('[websocket] Failed to read sensor payload:', error)
    return null
  }
}

export function setupWebSocket(httpServer: HttpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' })
  setupWebSocketConnections()
  return { redis }
}

export function getConnectedClientsCount() {
  return connectedClients.size
}
