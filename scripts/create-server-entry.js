import * as fs from 'fs'
import * as path from 'path'

const serverJsPath = path.join(process.cwd(), 'dist/server/server.js')
const indexJsPath = path.join(process.cwd(), 'dist/server/index.js')

// Read existing server.js
const serverContent = fs.readFileSync(serverJsPath, 'utf-8')

// Add HTTP server starter code with static file serving
const indexContent = `import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

${serverContent}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.join(__dirname, '..', 'client')
const PORT = parseInt(process.env.PORT ?? '3000', 10)
const HOST = process.env.HOST ?? '0.0.0.0'

const httpServer = http.createServer(async (req, res) => {
  const url = \`http://\${req.headers.host}\${req.url}\`
  const pathname = new URL(url).pathname
  
  // Try to serve static files from client directory
  if (pathname.startsWith('/assets/')) {
    const filePath = path.join(clientDir, pathname)
    
    // Security check: ensure the file is within clientDir
    if (!filePath.startsWith(clientDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' })
      res.end('Forbidden')
      return
    }
    
    try {
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath)
        const mimeTypes = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.woff': 'font/woff',
          '.woff2': 'font/woff2',
          '.ttf': 'font/ttf',
          '.eot': 'application/vnd.ms-fontobject',
        }
        
        const contentType = mimeTypes[ext] || 'application/octet-stream'
        const fileContent = fs.readFileSync(filePath)
        res.writeHead(200, { 
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000'
        })
        res.end(fileContent)
        return
      }
    } catch (error) {
      console.error('Error serving static file:', error)
    }
  }

  // Fall back to SSR for all other requests
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
  })

  try {
    const response = await server.fetch(request)
    res.writeHead(response.status, Object.fromEntries(response.headers))

    if (response.body) {
      const reader = response.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          res.write(value)
        }
      } finally {
        res.end()
      }
    } else {
      res.end()
    }
  } catch (error) {
    console.error('Error handling request:', error)
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end('Internal Server Error')
  }
})

httpServer.listen(PORT, HOST, () => {
  console.log(\`🚀 Server running at http://\${HOST}:\${PORT}\`)
})

export {}
`

fs.writeFileSync(indexJsPath, indexContent, 'utf-8')
console.log(`✅ Created ${indexJsPath}`)
