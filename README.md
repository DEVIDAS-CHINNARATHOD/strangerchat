# StrangerChat

StrangerChat is a real-time video and text chat application that allows users to connect with strangers anonymously. It features WebRTC for peer-to-peer video/audio communication and Socket.IO for signaling and text messaging.

## Features

- Anonymous chat (no login required)
- Two modes: Random Chat and Lobby List
- Real-time video and text chat
- WebRTC peer-to-peer connection
- Ability to mute audio
- Next/End Chat functionality

## Tech Stack

### Frontend (Deployed on Vercel)
- React.js
- Tailwind CSS
- Socket.IO Client
- WebRTC API

### Backend (Deployed on Render)
- Node.js
- Express
- Socket.IO
- WebRTC Signaling

## Deployment

### Backend (Render)
1. Push code to your GitHub repository
2. Create a new Web Service on [Render](https://render.com/)
3. Connect your repository
4. Set build command: `npm install`
5. Set start command: `node index.js`
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=10000`
7. Deploy

### Frontend (Vercel)
1. Push code to your GitHub repository
2. Create a new project on [Vercel](https://vercel.com/)
3. Import your repository
4. Set environment variables:
   - `REACT_APP_BACKEND_URL`: Your Render backend URL (e.g., https://strangerchat-backend.onrender.com)
   - `REACT_APP_ENV=production`
5. Deploy

### Backend
- Node.js
- Express.js
- Socket.IO

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Quick Setup (Recommended)

1. Install all dependencies at once:
   ```
   cd strengerchat
   npm run install-all
   ```

2. Start both the client and server:
   ```
   npm start
   ```

   This will start the server on `http://localhost:9000` and the client on `http://localhost:3000`.

### Manual Setup

#### Backend Setup

1. Navigate to the server directory:
   ```
   cd strengerchat/server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm run dev
   ```

   The server will run on `http://localhost:8080`.

#### Frontend Setup

1. Navigate to the client directory:
   ```
   cd strengerchat/client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

   The client will run on `http://localhost:3000`.

## How It Works

### WebRTC Connection Flow

1. User A and User B are matched (either randomly or via lobby)
2. User A creates an offer and sends it to User B via the signaling server
3. User B receives the offer, creates an answer, and sends it back to User A
4. Both users exchange ICE candidates
5. A peer-to-peer connection is established
6. Video and audio streams are exchanged directly between users

### Socket.IO Events

- `join-random`: Join the random chat queue
- `join-lobby`: Join the lobby with a nickname
- `connect-request`: Send a chat request to a user in the lobby
- `accept-request`: Accept a chat request
- `offer`, `answer`, `ice-candidate`: WebRTC signaling events
- `message`: Send a text message
- `end-chat`: End the current chat

## Testing with Multiple Users

To test the application with multiple users:
1. Open the application in two different browser windows or tabs
2. In one window, join the random chat or lobby
3. In the other window, do the same
4. You should be able to connect and chat between the two windows

## License

MIT 



for frontend
cd strengerchat\client; npm start

for backend
cd strengerchat\server; node index.js


