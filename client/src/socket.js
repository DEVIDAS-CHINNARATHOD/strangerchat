import { io } from 'socket.io-client';

const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://strangerchat-api.onrender.com';
const socket = io(backendUrl, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket']
});

export default socket; 