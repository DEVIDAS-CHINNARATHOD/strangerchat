import React, { useState, useEffect } from 'react';
import './App.css';
import socket from './socket';
import Lobby from './components/Lobby';
import ChatRoom from './components/ChatRoom';

function App() {
  // Get autoMatch from localStorage or default to true
  const savedAutoMatch = localStorage.getItem('autoMatch');
  const initialAutoMatch = savedAutoMatch !== null ? JSON.parse(savedAutoMatch) : true;
  
  const [mode, setMode] = useState(null); // 'random' or 'lobby' or null - start with null instead of 'random'
  const [isConnected, setIsConnected] = useState(false);
  const [partnerId, setPartnerId] = useState(null);
  const [chatMode, setChatMode] = useState(null); // 'random' or 'lobby'
  const [autoMatch, setAutoMatch] = useState(initialAutoMatch); // Auto-matching from localStorage
  
  useEffect(() => {
    // Connect to socket server when app loads
    socket.connect();
    
    // Set up event listeners for matching and disconnection
    socket.on('random-matched', handleRandomMatched);
    socket.on('chat-ended', handleChatEnded);
    socket.on('user-disconnected', handleUserDisconnected);
    
    // Clean up when component unmounts
    return () => {
      socket.disconnect();
      socket.off('random-matched', handleRandomMatched);
      socket.off('chat-ended', handleChatEnded);
      socket.off('user-disconnected', handleUserDisconnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Save autoMatch to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('autoMatch', JSON.stringify(autoMatch));
  }, [autoMatch]);
  
  const handleRandomMatched = (data) => {
    // We've been matched with someone in random mode
    setPartnerId(data.partnerId);
    setIsConnected(true);
    setChatMode('random');
  };
  
  const handleChatEnded = () => {
    // Chat has ended, go back to mode selection
    setIsConnected(false);
    setPartnerId(null);
    
    // If we were in random mode and auto-match is enabled, automatically join random queue again
    if (chatMode === 'random' && autoMatch) {
      joinRandomChat();
    }
  };
  
  const handleUserDisconnected = (userId) => {
    // If our partner disconnected, end the chat
    if (userId === partnerId) {
      handleChatEnded();
    }
  };
  
  const joinRandomChat = () => {
    // Join random chat queue
    socket.emit('join-random');
    setMode('random');
  };
  
  const joinLobby = () => {
    // Switch to lobby mode
    setMode('lobby');
    setAutoMatch(false); // Disable auto-matching when explicitly choosing lobby
  };
  
  const handleConnect = (userId, mode) => {
    // Connect with a user from lobby
    setPartnerId(userId);
    setIsConnected(true);
    setChatMode(mode);
  };
  
  const handleEndChat = (action) => {
    // End current chat and go back to mode selection
    if (partnerId) {
      socket.emit('end-chat', partnerId);
    }
    setIsConnected(false);
    setPartnerId(null);
    
    // Handle different actions
    if (action === 'next' || (action === 'home' && autoMatch && chatMode === 'random')) {
      // If action is 'next' or if autoMatch is enabled and we were in random mode
      joinRandomChat();
    } else {
      // Otherwise go back to home
      setMode(null);
    }
  };
  
  const toggleAutoMatch = () => {
    setAutoMatch(!autoMatch);
  };
  
  // Render mode selection screen
  if (!mode && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>StrengerChat</h1>
          <p className="app-tagline">Connect with strangers through video and text chat</p>
        </header>
        
        <div className="welcome-container">
          <div className="welcome-card">
            <h2>Start Chatting Now</h2>
            
            <div className="mode-selection">
              <button 
                className="mode-button random-mode"
                onClick={joinRandomChat}
              >
                <span className="mode-icon">🎲</span>
                <span className="mode-text">
                  <span className="mode-title">Random Chat</span>
                  <span className="mode-desc">Get matched with a random stranger instantly</span>
                </span>
              </button>
              
              <button 
                className="mode-button lobby-mode"
                onClick={joinLobby}
              >
                <span className="mode-icon">👥</span>
                <span className="mode-text">
                  <span className="mode-title">Browse Lobby</span>
                  <span className="mode-desc">See who's online and choose who to chat with</span>
                </span>
              </button>
            </div>
            
            <div className="auto-match-toggle">
              <label className="toggle-label">
                <input 
                  type="checkbox" 
                  checked={autoMatch}
                  onChange={toggleAutoMatch}
                />
                <span className="toggle-text">Auto-match after chat ends</span>
              </label>
            </div>
          </div>
          
          <div className="welcome-features">
            <div className="feature">
              <div className="feature-icon">🎥</div>
              <h3>Video Chat</h3>
              <p>Face-to-face conversations with people worldwide</p>
            </div>
            <div className="feature">
              <div className="feature-icon">💬</div>
              <h3>Text Chat</h3>
              <p>Send messages while video chatting</p>
            </div>
            <div className="feature">
              <div className="feature-icon">🔍</div>
              <h3>Find New Friends</h3>
              <p>Meet new people from around the world</p>
            </div>
          </div>
        </div>
        
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} StrengerChat - Connect with the world</p>
        </footer>
      </div>
    );
  }
  
  // Render lobby
  if (mode === 'lobby' && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrengerChat</h1>
            <button 
              className="back-button"
              onClick={() => setMode(null)}
            >
              <span className="button-icon">←</span> Back to Home
            </button>
          </div>
        </header>
        
        <div className="main-content">
          <Lobby onConnect={handleConnect} />
        </div>
      </div>
    );
  }
  
  // Render waiting screen for random mode
  if (mode === 'random' && !isConnected) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>StrengerChat</h1>
            <div className="header-controls">
              <div className="auto-match-toggle">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    checked={autoMatch}
                    onChange={toggleAutoMatch}
                  />
                  <span className="toggle-text">Auto-match</span>
                </label>
              </div>
              <button 
                className="cancel-button"
                onClick={() => setMode(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </header>
        
        <div className="waiting-container">
          <div className="waiting-card">
            <div className="spinner"></div>
            <h2>Looking for someone to chat with...</h2>
            <p>Please wait while we find a match for you</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render chat room when connected
  if (isConnected && partnerId) {
    return (
      <div className="app">
        <header className="app-header chat-header">
          <div className="header-content">
            <h1>StrengerChat</h1>
            <div className="header-controls">
              <div className="chat-status">
                <span className="status-indicator active"></span>
                <span className="status-text">{chatMode === 'random' ? 'Random Chat' : 'Lobby Chat'}</span>
              </div>
              <div className="auto-match-toggle">
                <label className="toggle-label">
                  <input 
                    type="checkbox" 
                    checked={autoMatch}
                    onChange={toggleAutoMatch}
                  />
                  <span className="toggle-text">Auto-match</span>
                </label>
              </div>
              <button 
                className="end-chat-button"
                onClick={() => handleEndChat('home')}
              >
                End Chat
              </button>
            </div>
          </div>
        </header>
        
        <div className="chat-container-wrapper">
          <ChatRoom 
            partnerId={partnerId} 
            onEndChat={handleEndChat} 
            mode={chatMode}
          />
        </div>
      </div>
    );
  }
  
  // Fallback
  return (
    <div className="app">
      <div className="loading">Loading...</div>
    </div>
  );
}

export default App; 