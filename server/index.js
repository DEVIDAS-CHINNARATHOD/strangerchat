const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const allowedOrigins = [
  'https://strangerchat-app.vercel.app', // Production frontend
  'http://localhost:3000' // Local development
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"]
  }
});

// Store active users
const activeUsers = new Map();
// Store users waiting for random chat
let randomQueue = [];
// Store users in lobby
const lobbyUsers = new Map();
// Store active connections between users
const activeConnections = new Map();
// Store chat messages
const chatMessages = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Add to active users
  activeUsers.set(socket.id, {
    id: socket.id,
    nickname: 'Anonymous',
    connectionTime: new Date().toISOString(),
    status: 'idle'
  });
  
  // Join random chat queue
  socket.on('join-random', () => {
    console.log(`${socket.id} joined random queue`);
    
    // Update user status
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.status = 'waiting';
      activeUsers.set(socket.id, user);
    }
    
    // Remove from lobby if they were there
    if (lobbyUsers.has(socket.id)) {
      lobbyUsers.delete(socket.id);
      io.emit('lobby-update', Array.from(lobbyUsers.values()));
    }
    
    // Add to random queue
    randomQueue.push(socket.id);
    
    // Check if we can match users
    if (randomQueue.length >= 2) {
      const user1 = randomQueue.shift();
      const user2 = randomQueue.shift();
      
      // Notify both users they've been matched
      io.to(user1).emit('random-matched', { partnerId: user2 });
      io.to(user2).emit('random-matched', { partnerId: user1 });
      
      // Create a connection record
      const connectionId = `${user1}-${user2}`;
      activeConnections.set(connectionId, {
        id: connectionId,
        users: [user1, user2],
        startTime: new Date().toISOString(),
        type: 'random'
      });
      
      // Initialize chat history for this connection
      chatMessages.set(connectionId, []);
      
      // Update user statuses
      if (activeUsers.has(user1)) {
        const user = activeUsers.get(user1);
        user.status = 'chatting';
        user.partnerId = user2;
        user.connectionId = connectionId;
        activeUsers.set(user1, user);
      }
      
      if (activeUsers.has(user2)) {
        const user = activeUsers.get(user2);
        user.status = 'chatting';
        user.partnerId = user1;
        user.connectionId = connectionId;
        activeUsers.set(user2, user);
      }
      
      console.log(`Matched ${user1} with ${user2} in random mode`);
    }
  });
  
  // Join lobby
  socket.on('join-lobby', (userData) => {
    console.log(`${socket.id} joined lobby as ${userData.nickname}`);
    
    // Remove from random queue if they were there
    randomQueue = randomQueue.filter(id => id !== socket.id);
    
    // Update user data
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.nickname = userData.nickname || 'Anonymous';
      user.status = 'in-lobby';
      activeUsers.set(socket.id, user);
    }
    
    // Add to lobby with user data
    lobbyUsers.set(socket.id, {
      id: socket.id,
      nickname: userData.nickname || 'Anonymous',
      ...userData
    });
    
    // Broadcast updated lobby list to all users
    io.emit('lobby-update', Array.from(lobbyUsers.values()));
  });
  
  // Connection request in lobby
  socket.on('connect-request', (targetId) => {
    console.log(`${socket.id} requested connection with ${targetId}`);
    
    // Forward request to target user
    io.to(targetId).emit('connect-request', {
      from: socket.id,
      userData: lobbyUsers.get(socket.id)
    });
  });
  
  // Accept connection request
  socket.on('accept-request', (targetId) => {
    console.log(`${socket.id} accepted connection request from ${targetId}`);
    
    // Notify both users that connection is accepted
    io.to(targetId).emit('request-accepted', {
      partnerId: socket.id
    });
    
    io.to(socket.id).emit('request-accepted', {
      partnerId: targetId
    });
    
    // Create a connection record
    const connectionId = `${socket.id}-${targetId}`;
    activeConnections.set(connectionId, {
      id: connectionId,
      users: [socket.id, targetId],
      startTime: new Date().toISOString(),
      type: 'lobby'
    });
    
    // Initialize chat history for this connection
    chatMessages.set(connectionId, []);
    
    // Update user statuses
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.status = 'chatting';
      user.partnerId = targetId;
      user.connectionId = connectionId;
      activeUsers.set(socket.id, user);
    }
    
    if (activeUsers.has(targetId)) {
      const user = activeUsers.get(targetId);
      user.status = 'chatting';
      user.partnerId = socket.id;
      user.connectionId = connectionId;
      activeUsers.set(targetId, user);
    }
  });
  
  // WebRTC signaling
  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', {
      offer: data.offer,
      from: socket.id
    });
  });
  
  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', {
      answer: data.answer,
      from: socket.id
    });
  });
  
  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });
  
  // Chat messages
  socket.on('message', (data) => {
    const messageData = {
      content: data.content,
      from: socket.id,
      timestamp: new Date().toISOString()
    };
    
    // Send message to target user
    io.to(data.target).emit('message', messageData);
    
    // Store message for history
    if (activeUsers.has(socket.id) && activeUsers.get(socket.id).connectionId) {
      const connectionId = activeUsers.get(socket.id).connectionId;
      if (chatMessages.has(connectionId)) {
        chatMessages.get(connectionId).push({
          ...messageData,
          to: data.target
        });
      }
    }
  });
  
  // Typing indicator
  socket.on('typing', (targetId) => {
    // Forward typing event to target user
    io.to(targetId).emit('typing');
  });
  
  // Next chat (end current chat)
  socket.on('end-chat', (partnerId) => {
    // Notify partner that chat has ended
    io.to(partnerId).emit('chat-ended', { by: socket.id });
    
    // Update connection status
    if (activeUsers.has(socket.id) && activeUsers.get(socket.id).connectionId) {
      const connectionId = activeUsers.get(socket.id).connectionId;
      
      if (activeConnections.has(connectionId)) {
        // Mark connection as ended
        const connection = activeConnections.get(connectionId);
        connection.endTime = new Date().toISOString();
        connection.status = 'ended';
        activeConnections.set(connectionId, connection);
        
        // Update user statuses
        if (activeUsers.has(socket.id)) {
          const user = activeUsers.get(socket.id);
          user.status = 'idle';
          user.partnerId = null;
          user.connectionId = null;
          activeUsers.set(socket.id, user);
        }
        
        if (activeUsers.has(partnerId)) {
          const user = activeUsers.get(partnerId);
          user.status = 'idle';
          user.partnerId = null;
          user.connectionId = null;
          activeUsers.set(partnerId, user);
        }
      }
    }
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Update connection if user was in a chat
    if (activeUsers.has(socket.id) && activeUsers.get(socket.id).connectionId) {
      const connectionId = activeUsers.get(socket.id).connectionId;
      const partnerId = activeUsers.get(socket.id).partnerId;
      
      if (activeConnections.has(connectionId)) {
        // Mark connection as ended
        const connection = activeConnections.get(connectionId);
        connection.endTime = new Date().toISOString();
        connection.status = 'ended';
        connection.endReason = 'disconnect';
        activeConnections.set(connectionId, connection);
        
        // Update partner status if they exist
        if (partnerId && activeUsers.has(partnerId)) {
          const user = activeUsers.get(partnerId);
          user.status = 'idle';
          user.partnerId = null;
          user.connectionId = null;
          activeUsers.set(partnerId, user);
        }
      }
    }
    
    // Remove from random queue
    randomQueue = randomQueue.filter(id => id !== socket.id);
    
    // Remove from lobby
    if (lobbyUsers.has(socket.id)) {
      lobbyUsers.delete(socket.id);
      io.emit('lobby-update', Array.from(lobbyUsers.values()));
    }
    
    // Remove from active users
    activeUsers.delete(socket.id);
    
    // Notify all connected peers that this user disconnected
    io.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('StrengerChat server is running');
}); 