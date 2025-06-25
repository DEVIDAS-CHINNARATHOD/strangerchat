import React, { useState, useEffect, useRef } from 'react';
import VideoChat from './VideoChat';
import socket from '../socket';

const ChatRoom = ({ partnerId, onEndChat, mode }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  useEffect(() => {
    // Set up message event listener
    socket.on('message', handleReceiveMessage);
    socket.on('typing', handlePartnerTyping);
    
    // Clean up when component unmounts
    return () => {
      socket.off('message', handleReceiveMessage);
      socket.off('typing', handlePartnerTyping);
    };
  }, [partnerId]);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const handleReceiveMessage = (data) => {
    setMessages(prevMessages => [
      ...prevMessages,
      {
        content: data.content,
        fromSelf: false,
        timestamp: data.timestamp || new Date().toISOString()
      }
    ]);
    
    // Clear typing indicator when message is received
    setPartnerTyping(false);
  };
  
  const handlePartnerTyping = () => {
    setPartnerTyping(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing indicator after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      setPartnerTyping(false);
    }, 2000);
  };
  
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Send typing indicator to partner
    socket.emit('typing', partnerId);
  };
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (inputMessage.trim() === '') return;
    
    // Send message to server
    socket.emit('message', {
      target: partnerId,
      content: inputMessage
    });
    
    // Add message to local state
    setMessages(prevMessages => [
      ...prevMessages,
      {
        content: inputMessage,
        fromSelf: true,
        timestamp: new Date().toISOString()
      }
    ]);
    
    // Clear input field
    setInputMessage('');
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleEndChat = () => {
    if (onEndChat) {
      onEndChat();
    }
  };
  
  const handleLeaveChat = () => {
    // Send end chat signal to partner
    socket.emit('end-chat', partnerId);
    // End chat locally
    handleEndChat();
  };
  
  return (
    <div className="chat-room">
      <div className="chat-content">
        {/* Video chat component */}
        <div className="video-section">
          <VideoChat 
            partnerId={partnerId} 
            onEndChat={handleEndChat} 
          />
        </div>
        
        {/* Text chat */}
        <div className="text-chat">
          <div className="chat-header">
            <h3>Chat Messages</h3>
          </div>
          
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`message ${message.fromSelf ? 'sent' : 'received'}`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-timestamp">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
            {partnerTyping && (
              <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="message-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="message-input"
            />
            <button 
              type="submit" 
              className="send-button"
              disabled={inputMessage.trim() === ''}
            >
              Send
            </button>
          </form>
        </div>
      </div>
      
      <div className="chat-footer">
        <div className="chat-info">
          <div className="chat-mode">
            <span className="mode-label">Mode:</span> 
            <span className="mode-value">{mode === 'random' ? 'Random Chat' : 'Lobby Chat'}</span>
          </div>
        </div>
        <button 
          className="leave-button"
          onClick={handleLeaveChat}
        >
          Leave Chat
        </button>
      </div>
    </div>
  );
};

export default ChatRoom; 