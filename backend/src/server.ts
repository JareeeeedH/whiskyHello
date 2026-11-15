import app from './app'
import { connectDatabase } from './config/db'
import { env } from './config/env'

async function start(): Promise<void> {
  try {
    await connectDatabase()
  } catch (error) {
    console.error('MongoDB connection failed.')

    if (env.isProduction) {
      // Do not log raw error.message — it may include credentials in the URI.
      console.error(
        'Refusing to start in production without a database. Check MONGODB_URI and network access.',
      )
      process.exit(1)
    }

    console.error(error instanceof Error ? error.message : error)
    console.warn('Development mode: continuing without database.')
  }

  const server = app.listen(env.port, () => {
    console.log(`Backend listening on http://localhost:${env.port}`)
    console.log(`Environment: ${env.nodeEnv}`)
  })

  server.on('error', (error: NodeJS.ErrnoException) => {
    console.error('Failed to start server:', error.message)
    process.exit(1)
  })
}

void start()
