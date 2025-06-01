import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import { authenticateToken } from './middleware/auth.js';
import { processChatCommand } from './utils/chatCommands.js';

// Load environment variables
dotenv.config();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000'
}));
app.use(express.json());
app.use(morgan('dev'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', authRoutes);

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO middleware
io.use(authenticateToken);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.emit('chat response', {
    type: 'info',
    message: 'Welcome to Personal Finance Assistant! Type /help for available commands.'
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });

  // Handle chat messages
  socket.on('chat message', async (message) => {
    try {
      const response = await processChatCommand(socket.user._id, message);
      socket.emit('chat response', response);
    } catch (error) {
      socket.emit('chat response', {
        type: 'error',
        message: error.message
      });
    }
  });
});

// Database connection
mongoose.connect('mongodb://localhost:27017/finance_assistant')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 