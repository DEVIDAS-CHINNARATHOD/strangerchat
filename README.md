# StrangerChat

A premium, modern video and text chat application built with React, Socket.io, and WebRTC. Let users connect randomly 1-on-1, browse a common lobby, or join topic-based Group Chats. Features a beautiful Dark Glassmorphism UI.

## Features

- **Random Chat:** Instantly match with a stranger for a 1-on-1 video & text conversation.
- **Lobby System:** See who is online and send direct connection requests.
- **Group Chat:** Join specific topic-based rooms (e.g. general, tech, gaming) and chat with multiple people simultaneously.
- **WebRTC Video:** Crystal clear peer-to-peer video streaming.
- **Real-time Messaging:** Fast text communication powered by Socket.io.
- **Premium UI:** Custom dark glassmorphism styling, clean SVG icons, fully responsive.

## Project Structure

This project is separated into a frontend React application and a backend Node.js Express server.

### `/client`
The frontend, built with React.
To run:
```bash
cd client
npm install
npm start
```

### `/server`
The backend, built with Node.js, Express and Socket.io.
To run:
```bash
cd server
npm install
npm start
```

## Deployment

The application is optimized for modern cloud deployments.
- **Client Deployment (e.g., Vercel):** The `client` directory includes a `vercel.json` file designed to handle React Single Page Application (SPA) routing correctly.
- **Server Deployment (e.g., Render, Heroku):** The `server` handles WebSockets. Ensure you set your environment variables correctly. Provide the frontend deployment URL in `allowedOrigins` inside `server/index.js` to avoid CORS issues.

## Environment Variables

In your `client/.env` file:
```
REACT_APP_BACKEND_URL=https://your-deployed-server-url.com
```
