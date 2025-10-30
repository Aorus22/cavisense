import { WebSocketServer, WebSocket } from 'ws'
import { Server as HttpServer } from 'http'
import Redis from 'ioredis'

export type SensorPayload = {
  receivedAt: string
  [key: string]: unknown
}

type RedisConfig = {
  host?: string
  port?: number
  username?: string
  password?: string
  sensorKey?: string
  channelName?: string
}

export class RedisManager {
  private client: Redis
  private subscriber: Redis
  private sensorKey: string
  private channelName: string

  constructor(config: RedisConfig = {}) {
    const redisOptions = {
      host: config.host ?? process.env.REDIS_HOST ?? '127.0.0.1',
      port: config.port ?? Number(process.env.REDIS_PORT ?? 6379),
      username: config.username ?? (process.env.REDIS_USERNAME || undefined),
      password: config.password ?? (process.env.REDIS_PASSWORD || undefined),
    }

    this.client = new Redis(redisOptions)
    this.subscriber = new Redis(redisOptions)
    this.sensorKey = config.sensorKey ?? process.env.REDIS_SENSOR_KEY ?? 'sensor:latest'
    this.channelName = config.channelName ?? process.env.REDIS_SENSOR_CHANNEL ?? 'sensor_updates'

    this.setupErrorHandlers()
  }

  private setupErrorHandlers() {
    this.client.on('error', (error) => {
      console.error('[redis-client] Connection error:', error)
    })

    this.subscriber.on('error', (error) => {
      console.error('[redis-subscriber] Connection error:', error)
    })
  }

  async publish(payload: SensorPayload): Promise<void> {
    try {
      await this.client.publish(this.channelName, JSON.stringify(payload))
      console.log('[redis] Published sensor update to channel')
    } catch (error) {
      console.error('[redis] Failed to publish to channel:', error)
      throw error
    }
  }

  async persist(payload: SensorPayload): Promise<void> {
    try {
      await this.client.set(this.sensorKey, JSON.stringify(payload))
      console.log('[redis] Sensor data persisted')
    } catch (error) {
      console.error('[redis] Failed to persist sensor payload:', error)
      throw error
    }
  }

  async getLatest(): Promise<SensorPayload | null> {
    try {
      const raw = await this.client.get(this.sensorKey)
      if (!raw) return null
      return JSON.parse(raw) as SensorPayload
    } catch (error) {
      console.error('[redis] Failed to read sensor payload:', error)
      return null
    }
  }

  subscribe(onMessage: (payload: SensorPayload) => void | Promise<void>): void {
    this.subscriber.subscribe(this.channelName, (err, count) => {
      if (err) {
        console.error('[redis] Failed to subscribe to channel:', err)
        return
      }
      console.log(`[redis] Subscribed to ${count} channel(s): ${this.channelName}`)
    })

    this.subscriber.on('message', async (channel, message) => {
      if (channel !== this.channelName) return

      try {
        const payload: SensorPayload = JSON.parse(message)
        console.log('[redis] Received sensor update from pub/sub')
        await onMessage(payload)
      } catch (error) {
        console.error('[redis] Failed to process pub/sub message:', error)
      }
    })
  }

  disconnect(): void {
    this.client.disconnect()
    this.subscriber.disconnect()
    console.log('[redis] Disconnected')
  }

  getClient(): Redis {
    return this.client
  }
}

export class WebSocketManager {
  private wss: WebSocketServer
  private connectedClients = new Set<WebSocket>()

  constructor(httpServer: HttpServer, path = '/ws') {
    this.wss = new WebSocketServer({ server: httpServer, path })
    this.setupConnections()
  }

  private setupConnections() {
    this.wss.on('connection', (socket) => {
      console.log('[websocket] Client connected')
      this.connectedClients.add(socket)

      socket.on('close', () => {
        console.log('[websocket] Client disconnected')
        this.connectedClients.delete(socket)
      })

      socket.on('error', (error) => {
        console.error('[websocket] Client error:', error)
        this.connectedClients.delete(socket)
      })
    })
  }

  async sendLatestDataToClient(socket: WebSocket, redisManager: RedisManager): Promise<void> {
    const latest = await redisManager.getLatest()
    if (latest && socket.readyState === WebSocket.OPEN) {
      socket.send(this.createSensorMessage(latest))
    }
  }

  broadcast(payload: SensorPayload): void {
    if (!this.connectedClients.size) {
      return
    }

    const message = this.createSensorMessage(payload)

    for (const socket of this.connectedClients) {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(message)
        } catch (error) {
          this.connectedClients.delete(socket)
          console.error('[websocket] Failed to deliver update:', error)
        }
      } else if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        this.connectedClients.delete(socket)
      }
    }
  }

  private createSensorMessage(payload: SensorPayload): string {
    return JSON.stringify({
      type: 'sensor:update',
      payload,
    })
  }

  getConnectedCount(): number {
    return this.connectedClients.size
  }

  close(): void {
    this.wss.close()
    console.log('[websocket] Server closed')
  }
}

export class SensorServerManager {
  private redisManager: RedisManager
  private wsManager: WebSocketManager

  constructor(httpServer: HttpServer) {
    this.redisManager = new RedisManager()
    this.wsManager = new WebSocketManager(httpServer)

    this.setupIntegration()
  }

  private setupIntegration() {
    // Setup connection handler untuk send latest data
    this.wsManager['wss'].on('connection', (socket) => {
      this.wsManager.sendLatestDataToClient(socket, this.redisManager)
    })

    // Subscribe to Redis pub/sub
    this.redisManager.subscribe(async (payload) => {
      await this.redisManager.persist(payload)
      this.wsManager.broadcast(payload)
    })
  }

  async publishSensorUpdate(payload: SensorPayload): Promise<void> {
    await this.redisManager.publish(payload)
  }

  getConnectedClientsCount(): number {
    return this.wsManager.getConnectedCount()
  }

  shutdown(): void {
    console.log('[sensor-server] Shutting down...')
    this.wsManager.close()
    this.redisManager.disconnect()
  }
}
