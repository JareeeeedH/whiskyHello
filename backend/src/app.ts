import express from 'express'
import { env } from './config/env'
import routes from './routes'
import { corsMiddleware } from './middlewares/cors'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'

const app = express()

// Only enable when behind a trusted reverse proxy (TRUST_PROXY=1).
// Trusts the first proxy hop so req.ip is safe for rate limiting.
if (env.trustProxy) {
  app.set('trust proxy', 1)
}

app.use(corsMiddleware)
app.use(express.json())
app.use('/api/v1', routes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
