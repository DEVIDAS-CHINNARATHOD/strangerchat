import { io } from 'socket.io-client';

// Create a socket connection to the server
const backendUrl = process.env.REACT_APP_BACKEND_URL || ' https://strangerchat-api.onrender.com';
const socket = io(backendUrl, {
  autoConnect: false, // We'll connect manually when needed
  withCredentials: true,
  transports: ['websocket']
});

// Socket event listeners for debugging
socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

export default socket; 