import express from 'express'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { createServer } from 'http'
import cors from 'cors'
// @ts-ignore
import startServer from './dist/server/server.js'
import {
  setupWebSocket,
  publishSensorUpdate,
  getConnectedClientsCount,
  type SensorPayload
} from './server-ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

const app = express()
const PORT = Number(process.env.PORT ?? 3000)
const DIST_CLIENT = resolve(__dirname, 'dist', 'client')

// Create HTTP server
const httpServer = createServer(app)

// ============ WebSocket Setup (same port as HTTP) ============
const { redis, redisSubscriber } = setupWebSocket(httpServer)

// ============ HTTP/SSR Setup ============

// Middleware
app.use(cors({
  origin: process.env.SENSOR_ALLOW_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// Sensor data endpoint
app.post('/send-sensor-data', async (req, res) => {
  try {
    const payload: Record<string, unknown> = req.body

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body' })
    }

    const normalizedPayload: SensorPayload = {
      ...payload,
      receivedAt: new Date().toISOString(),
    }

    await publishSensorUpdate(normalizedPayload)

    res.json({ status: 'ok' })
  } catch (error) {
    console.error('[http] Error processing sensor data:', error)
    res.status(500).json({ error: 'Failed to process sensor data' })
  }
})

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', wsClients: getConnectedClientsCount() })
})

// Serve static assets with aggressive caching
app.use('/assets', express.static(resolve(DIST_CLIENT, 'assets'), {
  maxAge: '1y',
  etag: false,
}))

// Serve public assets
app.use(express.static(DIST_CLIENT, {
  maxAge: '1h',
}))

// Catch-all for SSR
app.use(async (req, res) => {
  try {
    // Convert Express req/res to Request object
    const url = new URL(req.originalUrl || '/', `http://${req.headers.host}`)
    const request = new Request(url, {
      method: req.method,
      headers: req.headers as any,
    })

    const response = await startServer.fetch(request, { context: {} })

    if (response instanceof Response) {
      res.status(response.status)

      // Copy headers
      response.headers.forEach((value, key) => {
        res.setHeader(key, value)
      })

      if (response.body) {
        const reader = response.body.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(Buffer.from(value))
          }
        } catch (err) {
          reader.cancel()
          throw err
        }
      }
      res.end()
    } else {
      res.status(500).send('Internal Server Error')
    }
  } catch (error) {
    console.error('[ssr] Server error:', error)
    res.status(500).send('Internal Server Error')
  }
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})

redis.on('error', (error) => {
  console.error('[redis] Connection error:', error)
})

process.on('SIGINT', () => {
  console.log('[server] Shutting down...')
  httpServer.close()
  redis.disconnect()
  redisSubscriber.disconnect()
  process.exit(0)
})
