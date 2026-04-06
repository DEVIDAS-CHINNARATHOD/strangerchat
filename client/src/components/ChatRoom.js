import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';
import VideoChat from './VideoChat';

const ChatRoom = ({ partnerId, onEndChat, mode }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socket.on('message', handleReceiveMessage);
    socket.on('typing', handlePartnerTyping);
    
    return () => {
      socket.off('message', handleReceiveMessage);
      socket.off('typing', handlePartnerTyping);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, partnerTyping]);

  const handleReceiveMessage = (data) => {
    setMessages(prev => [...prev, { ...data, isSelf: false }]);
    setPartnerTyping(false);
  };

  const handlePartnerTyping = () => {
    setPartnerTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setPartnerTyping(false);
    }, 3000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageData = {
      target: partnerId,
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    socket.emit('message', messageData);
    
    setMessages(prev => [...prev, { ...messageData, isSelf: true }]);
    setInputMessage('');
    setIsTyping(false);
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', partnerId);
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="chat-room glass-panel">
      <div className="chat-content">
        <div className="video-section">
          <VideoChat partnerId={partnerId} isInitiator={mode === 'random'} />
        </div>
        
        <div className="text-chat">
          <div className="chat-header">
            <h3>Stranger {partnerId ? partnerId.substring(0, 4) : ''}</h3>
          </div>
          
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <p>You're now connected with a stranger.</p>
                <p>Say hi!</p>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div key={index} className={`message ${msg.isSelf ? 'sent' : 'received'}`}>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
            
            {partnerTyping && (
              <div className="message received typing-indicator" style={{ padding: '0.8rem' }}>
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <form className="message-input-form" onSubmit={sendMessage}>
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              className="glass-input message-input"
              placeholder="Type a message..."
            />
            <button 
              type="submit" 
              className="glass-button primary-button send-button"
              disabled={!inputMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;