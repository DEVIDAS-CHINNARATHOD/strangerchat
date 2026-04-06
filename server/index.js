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

// Store active users globally
const activeUsers = new Map();
// Store users waiting for random chat
let randomQueue = [];
// Store users in lobby
const lobbyUsers = new Map();
// Store active 1on1 connections
const activeConnections = new Map();
// Store chat messages for 1on1
const chatMessages = new Map();

// --- Group Chat State ---
// Map of roomName -> Set of { socketId, nickname }
const groupRooms = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  activeUsers.set(socket.id, {
    id: socket.id,
    nickname: 'Anonymous',
    connectionTime: new Date().toISOString(),
    status: 'idle'
  });
  
  // --- Group Chat Events ---
  socket.on('join-group', (data) => {
    const { roomName, nickname } = data;
    console.log(`${socket.id} (${nickname}) joined group: ${roomName}`);
    
    // Update global state
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.status = 'in-group';
      user.nickname = nickname || 'Anonymous';
      user.currentGroup = roomName;
      activeUsers.set(socket.id, user);
    }
    
    // Join the socket room
    socket.join(roomName);
    
    // Update groupRooms state
    if (!groupRooms.has(roomName)) {
      groupRooms.set(roomName, new Map());
    }
    groupRooms.get(roomName).set(socket.id, { id: socket.id, nickname: nickname || 'Anonymous' });
    
    const members = Array.from(groupRooms.get(roomName).values());
    
    // Broadcast to room that someone joined
    io.to(roomName).emit('group-update', { roomName, members });
    socket.to(roomName).emit('group-message', {
      type: 'system',
      content: `${nickname || 'Anonymous'} joined the group.`,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave-group', (roomName) => {
    console.log(`${socket.id} left group: ${roomName}`);
    socket.leave(roomName);
    
    if (groupRooms.has(roomName)) {
      const room = groupRooms.get(roomName);
      const nickname = room.has(socket.id) ? room.get(socket.id).nickname : 'Anonymous';
      room.delete(socket.id);
      
      const members = Array.from(room.values());
      if (members.length === 0) {
        groupRooms.delete(roomName);
      } else {
        io.to(roomName).emit('group-update', { roomName, members });
        io.to(roomName).emit('group-message', {
          type: 'system',
          content: `${nickname} left the group.`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.status = 'idle';
      delete user.currentGroup;
      activeUsers.set(socket.id, user);
    }
  });

  socket.on('group-message', (data) => {
    const { roomName, content } = data;
    const user = groupRooms.get(roomName)?.get(socket.id);
    const nickname = user ? user.nickname : 'Anonymous';
    
    socket.to(roomName).emit('group-message', {
      type: 'user',
      from: socket.id,
      nickname,
      content,
      timestamp: new Date().toISOString()
    });
  });

  // --- Random Chat Events ---
  socket.on('join-random', () => {
    console.log(`${socket.id} joined random queue`);
    
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.status = 'waiting';
      activeUsers.set(socket.id, user);
    }
    
    if (lobbyUsers.has(socket.id)) {
      lobbyUsers.delete(socket.id);
      io.emit('lobby-update', Array.from(lobbyUsers.values()));
    }
    
    randomQueue.push(socket.id);
    
    if (randomQueue.length >= 2) {
      const user1 = randomQueue.shift();
      const user2 = randomQueue.shift();
      
      io.to(user1).emit('random-matched', { partnerId: user2 });
      io.to(user2).emit('random-matched', { partnerId: user1 });
      
      const connectionId = `${user1}-${user2}`;
      activeConnections.set(connectionId, {
        id: connectionId,
        users: [user1, user2],
        startTime: new Date().toISOString(),
        type: 'random'
      });
      
      chatMessages.set(connectionId, []);
      
      const updateChattingUser = (uid, partner) => {
        if (activeUsers.has(uid)) {
          const user = activeUsers.get(uid);
          user.status = 'chatting';
          user.partnerId = partner;
          user.connectionId = connectionId;
          activeUsers.set(uid, user);
        }
      };
      updateChattingUser(user1, user2);
      updateChattingUser(user2, user1);
    }
  });
  
  // --- Lobby Events ---
  socket.on('join-lobby', (userData) => {
    console.log(`${socket.id} joined lobby as ${userData.nickname}`);
    randomQueue = randomQueue.filter(id => id !== socket.id);
    
    if (activeUsers.has(socket.id)) {
      const user = activeUsers.get(socket.id);
      user.nickname = userData.nickname || 'Anonymous';
      user.status = 'in-lobby';
      activeUsers.set(socket.id, user);
    }
    
    lobbyUsers.set(socket.id, {
      id: socket.id,
      nickname: userData.nickname || 'Anonymous',
      ...userData
    });
    
    io.emit('lobby-update', Array.from(lobbyUsers.values()));
  });
  
  socket.on('connect-request', (targetId) => {
    io.to(targetId).emit('connect-request', {
      from: socket.id,
      userData: lobbyUsers.get(socket.id)
    });
  });
  
  socket.on('accept-request', (targetId) => {
    io.to(targetId).emit('request-accepted', { partnerId: socket.id });
    io.to(socket.id).emit('request-accepted', { partnerId: targetId });
    
    const connectionId = `${socket.id}-${targetId}`;
    activeConnections.set(connectionId, {
      id: connectionId,
      users: [socket.id, targetId],
      startTime: new Date().toISOString(),
      type: 'lobby'
    });
    
    chatMessages.set(connectionId, []);
    
    const updateChattingUser = (uid, partner) => {
      if (activeUsers.has(uid)) {
        const user = activeUsers.get(uid);
        user.status = 'chatting';
        user.partnerId = partner;
        user.connectionId = connectionId;
        activeUsers.set(uid, user);
      }
    };
    updateChattingUser(socket.id, targetId);
    updateChattingUser(targetId, socket.id);
  });
  
  // --- WebRTC Signaling ---
  socket.on('offer', (data) => {
    io.to(data.target).emit('offer', { offer: data.offer, from: socket.id });
  });
  
  socket.on('answer', (data) => {
    io.to(data.target).emit('answer', { answer: data.answer, from: socket.id });
  });
  
  socket.on('ice-candidate', (data) => {
    io.to(data.target).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });
  
  // --- 1on1 Chat Messages ---
  socket.on('message', (data) => {
    const messageData = {
      content: data.content,
      from: socket.id,
      timestamp: new Date().toISOString()
    };
    
    io.to(data.target).emit('message', messageData);
    
    if (activeUsers.has(socket.id) && activeUsers.get(socket.id).connectionId) {
      const connectionId = activeUsers.get(socket.id).connectionId;
      if (chatMessages.has(connectionId)) {
        chatMessages.get(connectionId).push({ ...messageData, to: data.target });
      }
    }
  });
  
  socket.on('typing', (targetId) => {
    io.to(targetId).emit('typing');
  });
  
  // --- End 1on1 Chat ---
  socket.on('end-chat', (partnerId) => {
    io.to(partnerId).emit('chat-ended', { by: socket.id });
    
    if (activeUsers.has(socket.id) && activeUsers.get(socket.id).connectionId) {
      const connectionId = activeUsers.get(socket.id).connectionId;
      
      if (activeConnections.has(connectionId)) {
        const connection = activeConnections.get(connectionId);
        connection.endTime = new Date().toISOString();
        connection.status = 'ended';
        activeConnections.set(connectionId, connection);
        
        const resetUser = (uid) => {
          if (activeUsers.has(uid)) {
            const user = activeUsers.get(uid);
            user.status = 'idle';
            user.partnerId = null;
            user.connectionId = null;
            activeUsers.set(uid, user);
          }
        };
        resetUser(socket.id);
        resetUser(partnerId);
      }
    }
  });
  
  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const user = activeUsers.get(socket.id);
    if (!user) return;

    // Handle 1on1 disconnect
    if (user.connectionId) {
      const partnerId = user.partnerId;
      if (activeConnections.has(user.connectionId)) {
        const connection = activeConnections.get(user.connectionId);
        connection.endTime = new Date().toISOString();
        connection.status = 'ended';
        connection.endReason = 'disconnect';
        activeConnections.set(user.connectionId, connection);
        
        if (partnerId && activeUsers.has(partnerId)) {
          const pUser = activeUsers.get(partnerId);
          pUser.status = 'idle';
          pUser.partnerId = null;
          pUser.connectionId = null;
          activeUsers.set(partnerId, pUser);
        }
      }
    }
    
    // Handle group disconnect
    if (user.currentGroup && groupRooms.has(user.currentGroup)) {
      const roomName = user.currentGroup;
      const room = groupRooms.get(roomName);
      const nickname = room.has(socket.id) ? room.get(socket.id).nickname : 'Anonymous';
      room.delete(socket.id);
      
      const members = Array.from(room.values());
      if (members.length === 0) {
        groupRooms.delete(roomName);
      } else {
        io.to(roomName).emit('group-update', { roomName, members });
        io.to(roomName).emit('group-message', {
          type: 'system',
          content: `${nickname} disconnected.`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    randomQueue = randomQueue.filter(id => id !== socket.id);
    
    if (lobbyUsers.has(socket.id)) {
      lobbyUsers.delete(socket.id);
      io.emit('lobby-update', Array.from(lobbyUsers.values()));
    }
    
    activeUsers.delete(socket.id);
    io.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('StrangerChat API is running');
});