import app from './app'
import { connectDatabase } from './config/db'
import { env } from './config/env'

async function start(): Promise<void> {
  try {
    await connectDatabase()
  } catch (error) {
    console.warn('MongoDB connection failed; continuing without database.')
    console.warn(error instanceof Error ? error.message : error)
  }

  const server = app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  })
}

void start()
