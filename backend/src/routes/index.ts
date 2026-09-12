import { Router } from 'express'
import authRoutes from './authRoutes'
import reviewRoutes from './reviewRoutes'
import { env, getGoogleClientIdDebugInfo } from '../config/env'

const router = Router()

router.get('/health', (_req, res) => {
  const googleDebug = getGoogleClientIdDebugInfo()

  res.json({
    status: 'ok',
    service: 'whiskyhello-backend',
    // Temporary safe Google diagnostics (no secret values).
    google: {
      configured: googleDebug.configured,
      length: googleDebug.length,
      snapshotConfigured: Boolean(env.googleClientId),
      snapshotLength: env.googleClientId.length,
      relatedEnvKeys: googleDebug.relatedEnvKeys,
    },
  })
})

router.use('/auth', authRoutes)
router.use(reviewRoutes)

export default router
