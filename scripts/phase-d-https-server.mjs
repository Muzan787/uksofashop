import fs from 'node:fs'
import https from 'node:https'
import next from 'next'

const hostname = process.env.PHASE_D_QA_HOST || '127.0.0.1'
const port = Number(process.env.PHASE_D_QA_PORT || 3100)
const keyPath = process.env.PHASE_D_TLS_KEY
const certPath = process.env.PHASE_D_TLS_CERT

if (!keyPath || !certPath) {
  throw new Error('PHASE_D_TLS_KEY and PHASE_D_TLS_CERT are required')
}

const app = next({ dev: false, dir: process.cwd(), hostname, port })
await app.prepare()
const handle = app.getRequestHandler()

const server = https.createServer({
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath),
}, (req, res) => {
  void handle(req, res)
})

server.listen(port, hostname, () => {
  console.log(`[phase-d-https] ready https://${hostname}:${port}`)
})

function stop(signal) {
  console.log(`[phase-d-https] ${signal}`)
  server.close(() => process.exit(0))
}

process.on('SIGTERM', () => stop('SIGTERM'))
process.on('SIGINT', () => stop('SIGINT'))
