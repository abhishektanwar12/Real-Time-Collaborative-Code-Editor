import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { connectDatabase } from './config/database.js';
import { createToken, hashPassword, verifyPassword } from './utils/auth.js';
import { runCode } from './utils/execution.js';
import {
  createRoomState,
  addUserToRoom,
  removeUserFromRoom,
  updateRoomCode,
  addMessageToRoom
} from './sockets/sessionStore.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const activeRooms = new Map();

async function persistRoomState(roomState) {
  try {
    const database = await connectDatabase();
    await database.collection('rooms').updateOne(
      { _id: roomState.id },
      { $set: { ...roomState, updatedAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    console.error('Mongo persistence failed', error.message);
  }
}

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const database = await connectDatabase();
  const existingUser = await database.collection('users').findOne({ username });

  if (existingUser) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const hashedPassword = await hashPassword(password);
  await database.collection('users').insertOne({ username, password: hashedPassword });

  res.json({ success: true });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const database = await connectDatabase();
  const storedUser = await database.collection('users').findOne({ username });

  if (!storedUser) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isPasswordValid = await verifyPassword(password, storedUser.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const authToken = createToken({ id: storedUser._id.toString(), username });
  res.json({ token: authToken, username });
});

app.post('/execute', async (req, res) => {
  const { language, code } = req.body;
  const executionResult = await runCode(language, code);
  res.json(executionResult);
});

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, userName }) => {
    const normalizedRoomId = roomId || 'default-room';
    const normalizedUserName = userName || 'Anonymous';

    socket.join(normalizedRoomId);

    if (!activeRooms.has(normalizedRoomId)) {
      activeRooms.set(normalizedRoomId, createRoomState(normalizedRoomId));
    }

    const roomState = activeRooms.get(normalizedRoomId);
    const updatedRoomState = addUserToRoom(roomState, {
      id: socket.id,
      name: normalizedUserName
    });
    activeRooms.set(normalizedRoomId, updatedRoomState);
    persistRoomState(updatedRoomState);

    io.to(normalizedRoomId).emit('room-updated', updatedRoomState);
  });

  socket.on('editor-change', ({ roomId, code }) => {
    const roomState = activeRooms.get(roomId);
    if (!roomState) {
      return;
    }

    const updatedRoomState = updateRoomCode(roomState, code);
    activeRooms.set(roomId, updatedRoomState);
    persistRoomState(updatedRoomState);
    socket.to(roomId).emit('code-updated', { code });
  });

  socket.on('send-message', ({ roomId, message }) => {
    const roomState = activeRooms.get(roomId);
    if (!roomState) {
      return;
    }

    const updatedRoomState = addMessageToRoom(roomState, message);
    activeRooms.set(roomId, updatedRoomState);
    persistRoomState(updatedRoomState);
    io.to(roomId).emit('room-updated', updatedRoomState);
  });

  socket.on('disconnect', () => {
    for (const [roomId, roomState] of activeRooms.entries()) {
      const updatedRoomState = removeUserFromRoom(roomState, socket.id);
      if (updatedRoomState.users.length !== roomState.users.length) {
        activeRooms.set(roomId, updatedRoomState);
        persistRoomState(updatedRoomState);
        io.to(roomId).emit('room-updated', updatedRoomState);
      }
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
