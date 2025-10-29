import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
  type RequestHandler,
} from '@tanstack/react-start/server'
import type { Register } from '@tanstack/react-router'
import Redis from 'ioredis'
import { WebSocketServer, WebSocket } from 'ws'

type SensorPayload = {
  receivedAt: string
  [key: string]: unknown
}

const SENSOR_REDIS_KEY = process.env.REDIS_SENSOR_KEY ?? 'sensor:latest'
const ALLOWED_SENSOR_METHODS = 'POST, OPTIONS'

declare global {
  // eslint-disable-next-line no-var
  var __cavisenseRedis: Redis | undefined
  // eslint-disable-next-line no-var
  var __cavisenseLatestSensor: SensorPayload | null | undefined
  // eslint-disable-next-line no-var
  var __cavisenseWsServer: WebSocketServer | undefined
  // eslint-disable-next-line no-var
  var __cavisenseWsClients: Set<WebSocket> | undefined
  // eslint-disable-next-line no-var
  var __cavisenseWsPort: number | undefined
}

const redis = (() => {
  if (globalThis.__cavisenseRedis) {
    return globalThis.__cavisenseRedis
  }

  const instance = createRedisClient()
  globalThis.__cavisenseRedis = instance
  return instance
})()

void redis.connect().catch((error) => {
  console.error('[cavisense] Initial Redis connection failed:', error)
})

const connectedClients = (() => {
  if (!globalThis.__cavisenseWsClients) {
    globalThis.__cavisenseWsClients = new Set<WebSocket>()
  }
  return globalThis.__cavisenseWsClients
})()

redis.on('error', (error) => {
  console.error('[cavisense] Redis error:', error)
})

ensureWebSocketServer()

function ensureWebSocketServer() {
  if (globalThis.__cavisenseWsServer) {
    return globalThis.__cavisenseWsServer
  }

  const configuredPort = process.env.SENSOR_WS_PORT ?? process.env.VITE_SENSOR_WS_PORT
  const port = Number(configuredPort ?? 3010)
  const host = process.env.SENSOR_WS_HOST ?? '0.0.0.0'

  try {
    const server = new WebSocketServer({ port, host })
    globalThis.__cavisenseWsServer = server
    globalThis.__cavisenseWsPort = port

    server.on('connection', (socket) => {
      connectedClients.add(socket)

      void (async () => {
        const latest = await getLatestSensorPayload()
        if (latest && socket.readyState === WebSocket.OPEN) {
          socket.send(createSensorMessage(latest))
        }
      })()

      socket.on('close', () => {
        connectedClients.delete(socket)
      })

      socket.on('error', (error) => {
        connectedClients.delete(socket)
        console.error('[cavisense] WebSocket client error:', error)
      })
    })

    server.on('error', (error) => {
      console.error('[cavisense] WebSocket server error:', error, {
        host,
        port,
      })
    })

    console.info(`[cavisense] WebSocket server listening on ws://${host}:${port}`)
    return server
  } catch (error) {
    console.error('[cavisense] Failed to start WebSocket server:', error, {
      host,
      port,
    })
    return undefined
  }
}

const fetch = createStartHandler(
  defineHandlerCallback(async (ctx) => {
    const { request } = ctx
    const url = new URL(request.url)

    if (url.pathname === '/send-sensor-data') {
      return handleSensorIngress(request)
    }

    return defaultStreamHandler(ctx)
  }),
)

export default {
  fetch: fetch as RequestHandler<Register>,
}

async function handleSensorIngress(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(),
    })
  }

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: createCorsHeaders({
          Allow: ALLOWED_SENSOR_METHODS,
          'Content-Type': 'application/json',
        }),
      },
    )
  }

  const corsHeaders = createCorsHeaders({
    'Content-Type': 'application/json',
  })

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch (error) {
    console.error('[cavisense] Invalid sensor payload JSON:', error)
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      {
        status: 400,
        headers: corsHeaders,
      },
    )
  }

  const normalizedPayload: SensorPayload = {
    ...payload,
    receivedAt: new Date().toISOString(),
  }

  try {
    await persistLatestSensorPayload(normalizedPayload)
    broadcastSensorUpdate(normalizedPayload)
  } catch (error) {
    console.error('[cavisense] Failed to persist sensor payload:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to persist sensor payload' }),
      {
        status: 500,
        headers: corsHeaders,
      },
    )
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: corsHeaders,
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
        console.error('[cavisense] Failed to deliver sensor update:', error)
      }
    } else if (
      socket.readyState === WebSocket.CLOSED ||
      socket.readyState === WebSocket.CLOSING
    ) {
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

async function persistLatestSensorPayload(payload: SensorPayload) {
  globalThis.__cavisenseLatestSensor = payload
  await redis.set(SENSOR_REDIS_KEY, JSON.stringify(payload))
}

async function getLatestSensorPayload(): Promise<SensorPayload | null> {
  if (globalThis.__cavisenseLatestSensor) {
    return globalThis.__cavisenseLatestSensor
  }

  try {
    const raw = await redis.get(SENSOR_REDIS_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as SensorPayload
    globalThis.__cavisenseLatestSensor = parsed
    return parsed
  } catch (error) {
    console.error('[cavisense] Failed to read sensor payload from Redis:', error)
    return null
  }
}

function createCorsHeaders(extra?: Record<string, string>): Headers {
  const origin = process.env.SENSOR_ALLOW_ORIGIN ?? '*'
  const headers = new Headers({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_SENSOR_METHODS,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })

  if (origin !== '*') {
    headers.append('Vary', 'Origin')
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      headers.set(key, value)
    }
  }

  return headers
}

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL
  if (redisUrl && redisUrl.trim().length > 0) {
    return new Redis(redisUrl, {
      lazyConnect: true,
    })
  }

  return new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
  })
}

export {}
