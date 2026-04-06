import React, { useState, useEffect } from 'react';
import './App.css';
import socket from './socket';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';
import GroupChat from './components/GroupChat';

// SVG Icons
const RandomIcon = () => (
  <svg xmlns="http://www.000000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <circle cx="15.5" cy="15.5" r="1.5"></circle>
  </svg>
);

const LobbyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 19a6 6 0 0 0-12 0" />
    <circle cx="8" cy="9" r="4" />
    <path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8" />
  </svg>
);

const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const ChatIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const GlobalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
  </svg>
);


function App() {
  const savedAutoMatch = localStorage.getItem('autoMatch');
  const initialAutoMatch = savedAutoMatch !== null ? JSON.parse(savedAutoMatch) : true;
  
  const [mode, setMode] = useState(null); // 'random', 'lobby', 'group' or null
  const [isConnected, setIsConnected] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const [chatMode, setChatMode] = useState(null); 
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch);
  
  useEffect(() => {
    socket.connect();
    
    socket.on('random-matched', handleRandomMatched);
    socket.on('chat-ended', handleChatEnded);
    socket.on('user-disconnected', handleUserDisconnected);
    
    return () => {
      socket.disconnect();
      socket.off('random-matched', handleRandomMatched);
      socket.off('chat-ended', handleChatEnded);
      socket.off('user-disconnected', handleUserDisconnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  useEffect(() => {
    localStorage.setItem('autoMatch', JSON.stringify(autoMatch));
  }, [autoMatch]);
  
  const handleRandomMatched = (data) => {
    setPartnerId(data.partnerId);
    setIsConnected(true);
    setChatMode('random');
  };
  
  const handleChatEnded = () => {
    setIsConnected(false);
    setPartnerId(null);
    if (chatMode === 'random' && autoMatch) {
      joinRandomChat();
    }
  };
  
  const handleUserDisconnected = (userId) => {
    if (userId === partnerId) {
      handleChatEnded();
    }
  };
  
  const joinRandomChat = () => {
    socket.emit('join-random');
    setMode('random');
  };
  
  const joinLobby = () => {
    setMode('lobby');
    setAutoMatch(false);
  };

  const joinGroupSelect = () => {
    setMode('group');
    setAutoMatch(false);
  };
  
  const handleConnect = (userId, mode) => {
    setPartnerId(userId);
    setIsConnected(true);
    setChatMode(mode);
  };
  
  const handleEndChat = (action) => {
    if (partnerId) {
      socket.emit('end-chat', partnerId);
    }
    setIsConnected(false);
    setPartnerId(null);
    
    if (action === 'next' || (action === 'home' && autoMatch && chatMode === 'random')) {
      joinRandomChat();
    } else {
      setMode(null);
    }
  };
  
  const toggleAutoMatch = () => {
    setAutoMatch(!autoMatch);
  };
  
  if (!mode && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrangerChat</h1>
            <div className="app-tagline">Premium Video & Text Connections</div>
          </div>
        </header>
        
        <div className="welcome-container">
          <div className="welcome-card glass-panel">
            <h2>Start Chatting Now</h2>
            
            <div className="mode-selection">
              <button className="mode-button glass-button primary" onClick={joinRandomChat}>
                <span className="mode-icon"><RandomIcon /></span>
                <span className="mode-text">
                  <span className="mode-title">Random Chat</span>
                  <span className="mode-desc">Instant 1-on-1 matches</span>
                </span>
              </button>
              
              <button className="mode-button glass-button" onClick={joinLobby}>
                <span className="mode-icon"><LobbyIcon /></span>
                <span className="mode-text">
                  <span className="mode-title">Lobby</span>
                  <span className="mode-desc">Find who's online</span>
                </span>
              </button>

              <button className="mode-button glass-button" onClick={joinGroupSelect}>
                <span className="mode-icon"><GroupIcon /></span>
                <span className="mode-text">
                  <span className="mode-title">Group Chat</span>
                  <span className="mode-desc">Join topic-based rooms</span>
                </span>
              </button>
            </div>
            
            <div className="auto-match-toggle">
              <label className="toggle-label">
                <input type="checkbox" checked={autoMatch} onChange={toggleAutoMatch} />
                <span className="toggle-text">Auto-match after chat ends</span>
              </label>
            </div>
          </div>
          
          <div className="welcome-features">
            <div className="feature glass-panel">
              <div className="feature-icon"><VideoIcon /></div>
              <h3>HD Video Chat</h3>
              <p>Crystal clear face-to-face conversations.</p>
            </div>
            <div className="feature glass-panel">
              <div className="feature-icon"><ChatIcon /></div>
              <h3>Instant Text</h3>
              <p>Fast, reliable messaging in real time.</p>
            </div>
            <div className="feature glass-panel">
              <div className="feature-icon"><GlobalIcon /></div>
              <h3>Global Community</h3>
              <p>Connect with absolute strangers worldwide.</p>
            </div>
          </div>
        </div>
        
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} StrangerChat. All rights reserved.</p>
        </footer>
      </div>
    );
  }
  
  if (mode === 'lobby' && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrangerChat</h1>
            <button className="back-button glass-button" onClick={() => setMode(null)}>
              ← Back
            </button>
          </div>
        </header>
        <div className="main-content">
          <Lobby onConnect={handleConnect} />
        </div>
      </div>
    );
  }

  if (mode === 'group' && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrangerChat</h1>
            <button className="back-button glass-button" onClick={() => setMode(null)}>
              ← Back
            </button>
          </div>
        </header>
        <div className="main-content">
          <GroupChat onLeave={() => setMode(null)} />
        </div>
      </div>
    );
  }
  
  if (mode === 'random' && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrangerChat</h1>
            <div className="header-controls">
              <label className="toggle-label">
                <input type="checkbox" checked={autoMatch} onChange={toggleAutoMatch} />
                <span className="toggle-text">Auto-match</span>
              </label>
              <button className="cancel-button danger-button" onClick={() => setMode(null)}>Cancel</button>
            </div>
          </div>
        </header>
        
        <div className="waiting-container">
          <div className="welcome-card glass-panel">
            <div className="spinner"></div>
            <h2>Looking for a match...</h2>
            <p style={{ color: 'var(--text-secondary)'}}>Hold tight, finding someone special.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (isConnected && partnerId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrangerChat</h1>
            <div className="header-controls">
              <div className="chat-status">
                <span className="status-indicator active"></span>
                <span className="status-text">{chatMode === 'random' ? 'Random Chat' : 'Lobby Chat'}</span>
              </div>
              <label className="toggle-label">
                <input type="checkbox" checked={autoMatch} onChange={toggleAutoMatch}/>
                <span className="toggle-text">Auto-match</span>
              </label>
              <button className="end-chat-button danger-button" onClick={() => handleEndChat('home')}>
                End Chat
              </button>
            </div>
          </div>
        </header>
        
        <div className="chat-container-wrapper">
          <ChatRoom partnerId={partnerId} onEndChat={handleEndChat} mode={chatMode} />
        </div>
      </div>
    );
  }
  
  return <div className="app"><div className="waiting-container"><div className="spinner"></div></div></div>;
}

export default App;