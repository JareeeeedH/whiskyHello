import mongoose from 'mongoose'
import { env } from './env'

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 15000,
  })
  console.log('MongoDB connected')
}
