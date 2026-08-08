import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { conversationRouter } from './routes/conversation.js'
import { healthRouter } from './routes/health.js'

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json())
app.use('/api', healthRouter)
app.use('/api', conversationRouter)

app.listen(port, () => {
  console.log(`Backend corriendo en http://localhost:${port}`)
})
