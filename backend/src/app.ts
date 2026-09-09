import express from 'express'
import routes from './routes'
import { errorHandler, notFoundHandler } from './middlewares/errorHandler'

const app = express()

app.use(express.json())
app.use('/api/v1', routes)
app.use(notFoundHandler)
app.use(errorHandler)

export default app
