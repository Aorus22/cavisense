import { WebSocketServer, WebSocket } from 'ws'
import { Server as HttpServer } from 'http'
import Redis from 'ioredis'

export type SensorPayload = {
  receivedAt: string
  [key: string]: unknown
}

const SENSOR_REDIS_KEY = process.env.REDIS_SENSOR_KEY ?? 'sensor:latest'
const SENSOR_CHANNEL = process.env.REDIS_SENSOR_CHANNEL ?? 'sensor_updates'

// Redis client untuk operasi normal (get/set)
const redis = new Redis({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
})

// Redis subscriber untuk pub/sub
const redisSubscriber = new Redis({
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

function broadcastSensorUpdate(payload: SensorPayload) {
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

// Setup Redis pub/sub subscriber
function setupRedisSubscriber() {
  // Subscribe ke channel sensor_updates
  redisSubscriber.subscribe(SENSOR_CHANNEL, (err, count) => {
    if (err) {
      console.error('[redis] Failed to subscribe to channel:', err)
      return
    }
    console.log(`[redis] Subscribed to ${count} channel(s): ${SENSOR_CHANNEL}`)
  })

  // Handle message dari channel
  redisSubscriber.on('message', async (channel, message) => {
    if (channel !== SENSOR_CHANNEL) return

    try {
      const payload: SensorPayload = JSON.parse(message)
      console.log('[redis] Received sensor update from pub/sub')

      // Persist ke Redis dan broadcast ke WebSocket clients
      await persistLatestSensorPayload(payload)
      broadcastSensorUpdate(payload)
    } catch (error) {
      console.error('[redis] Failed to process pub/sub message:', error)
    }
  })

  redisSubscriber.on('error', (error) => {
    console.error('[redis-subscriber] Connection error:', error)
  })
}

// Publish sensor update ke Redis channel
export async function publishSensorUpdate(payload: SensorPayload) {
  try {
    await redis.publish(SENSOR_CHANNEL, JSON.stringify(payload))
    console.log('[redis] Published sensor update to channel')
  } catch (error) {
    console.error('[redis] Failed to publish to channel:', error)
  }
}

export function setupWebSocket(httpServer: HttpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' })
  setupWebSocketConnections()
  setupRedisSubscriber()
  return { redis, redisSubscriber }
}

export function getConnectedClientsCount() {
  return connectedClients.size
}
