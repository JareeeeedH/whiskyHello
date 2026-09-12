import app from './app'
import { connectDatabase } from './config/db'
import { env, getGoogleClientIdDebugInfo } from './config/env'

async function start(): Promise<void> {
  const googleDebug = getGoogleClientIdDebugInfo()
  // Temporary safe diagnostics — never log the client id value itself.
  console.info('GOOGLE_CLIENT_ID configured:', googleDebug.configured)
  console.info('GOOGLE_CLIENT_ID length:', googleDebug.length)
  console.info(
    'GOOGLE related env keys:',
    googleDebug.relatedEnvKeys.length > 0
      ? googleDebug.relatedEnvKeys.join(', ')
      : '(none)',
  )
  console.info(
    'env.googleClientId snapshot configured:',
    Boolean(env.googleClientId),
    'length:',
    env.googleClientId.length,
  )

  try {
    await connectDatabase()
  } catch (error) {
    console.error('MongoDB connection failed.')
    console.error(error instanceof Error ? error.message : error)

    if (env.isProduction) {
      console.error('Refusing to start in production without a database.')
      process.exit(1)
    }

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
