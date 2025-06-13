import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import { WebSocketServer } from 'ws'
import http from 'http'

const prisma = new PrismaClient()
const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

let sockets = []

wss.on('connection', (ws) => {
  sockets.push(ws)

  ws.on('close', () => {
    sockets = sockets.filter((s) => s !== ws)
  })
})

function broadcastUsers() {
  prisma.user.findMany().then((users) => {
    const data = JSON.stringify({ type: 'UPDATE_USERS', payload: users })
    sockets.forEach((socket) => {
      if (socket.readyState === 1) {
        socket.send(data)
      }
    })
  })

  setInterval(() => {
  sockets.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'PING' }))
    }
  })
}, 25000) // a cada 25 segundos
}



app.use(express.json())
app.use(cors({ origin: 'https://pap0reto.netlify.app/' }))

app.post('/usuarios', async (req, res) => {
  await prisma.user.create({
    data: {
      name: req.body.name,
      menssage: req.body.menssage,
    },
  })

  broadcastUsers()
  res.status(201).json(req.body)
})

app.delete('/usuarios/:id', async (req, res) => {
  await prisma.user.delete({
    where: { id: req.params.id },
  })

  broadcastUsers()
  res.status(200).json({ menssage: 'Usuario Deletado !' })
})

app.get('/usuarios', async (req, res) => {
  const users = await prisma.user.findMany()
  res.status(200).json(users)
})

server.listen(3001, () => {
  console.log('Servidor rodando na porta 3001')
})