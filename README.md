# StrangerChat

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2FDEVIDAS-CHINNARATHOD%2Fstrangerchat)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

StrangerChat is a real-time video and text chat application that allows users to connect with strangers anonymously. It features WebRTC for peer-to-peer video/audio communication and Socket.IO for signaling and text messaging.

## 🌟 Features

- **Anonymous Chat**: No registration or login required
- **Multiple Modes**: 
  - Random Chat: Connect with random strangers
  - Lobby: Join public chat rooms
- **Real-time Communication**:
  - Video and audio calls
  - Text messaging
  - Typing indicators
- **User Controls**:
  - Mute/unmute audio
  - Toggle video on/off
  - End chat anytime
  - Next chat option
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Live Demo

- **Frontend**: [View Live Demo](https://strangerchat-app.vercel.app)
- **Backend API**: [API Documentation](https://strangerchat-api.onrender.com)

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Real-time**: Socket.IO Client
- **WebRTC**: Peer-to-peer video/audio

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **WebSockets**: Socket.IO
- **CORS**: Cross-Origin Resource Sharing
- **Environment**: Environment variables

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher) or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/DEVIDAS-CHINNARATHOD/strangerchat.git
   cd strangerchat
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   cd ..
   ```

3. **Environment Setup**
   - Create a `.env` file in the `client` directory:
     ```env
     REACT_APP_BACKEND_URL=http://localhost:9000
     REACT_APP_ENV=development
     REACT_APP_NAME=StrangerChat
     ```

4. **Start Development Servers**
   - In one terminal (backend):
     ```bash
     cd server
     npm run dev
     ```
   - In another terminal (frontend):
     ```bash
     cd client
     npm start
     ```

5. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:9000

## 🌐 Production Deployment

### Backend Deployment (Render)
1. Push your code to a GitHub repository
2. Create a new Web Service on [Render](https://render.com/)
3. Connect your GitHub repository
4. Configure the service:
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `PORT=10000`

### Frontend Deployment (Vercel)
1. Push your code to a GitHub repository
2. Create a new project on [Vercel](https://vercel.com/)
3. Import your repository
4. Configure environment variables:
   - `REACT_APP_BACKEND_URL`: Your Render backend URL (e.g., `https://strangerchat-api.onrender.com`)
   - `REACT_APP_ENV=production`
   - `REACT_APP_NAME=StrangerChat`

## 🔧 Troubleshooting

### Common Issues
1. **Video/Audio Not Working**
   - Ensure browser permissions are granted for camera and microphone
   - Try using Chrome or Firefox
   - Check for any browser extensions blocking WebRTC

2. **Connection Issues**
   - Verify both frontend and backend are running
   - Check browser console for errors (F12 > Console)
   - Ensure CORS is properly configured on the backend

3. **Development vs Production**
   - Use `http://localhost:9000` for development
   - Use your production URL (e.g., `https://strangerchat-api.onrender.com`) in production

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WebRTC](https://webrtc.org/) for real-time communication
- [Socket.IO](https://socket.io/) for WebSocket communication
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vercel](https://vercel.com/) and [Render](https://render.com/) for hosting
