import React, { useState, useEffect, useRef } from 'react';
import socket from '../socket';

const GroupChat = ({ onLeave }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [nickname, setNickname] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('group-update', handleGroupUpdate);
    socket.on('group-message', handleGroupMessage);
    
    return () => {
      socket.off('group-update', handleGroupUpdate);
      socket.off('group-message', handleGroupMessage);
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGroupUpdate = (data) => {
    setMembers(data.members);
  };

  const handleGroupMessage = (data) => {
    setMessages(prev => [...prev, data]);
  };

  const joinGroup = (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    socket.emit('join-group', {
      roomName: roomName.trim(),
      nickname: nickname.trim() || 'Anonymous'
    });
    
    setIsJoined(true);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('group-message', {
      roomName,
      content: inputMessage
    });

    setMessages(prev => [...prev, {
      type: 'user',
      from: socket.id,
      nickname: nickname || 'Anonymous',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      isSelf: true
    }]);

    setInputMessage('');
  };

  const handleLeaveGroup = () => {
    socket.emit('leave-group', roomName);
    setIsJoined(false);
    setMessages([]);
    setMembers([]);
    if (onLeave) onLeave();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isJoined) {
    return (
      <div className="join-container">
        <div className="join-card glass-panel">
          <h2>Join Group Chat</h2>
          <p className="join-description">Enter a room name to join an existing group or create a new one.</p>
          
          <form onSubmit={joinGroup}>
            <div className="input-group">
              <label>Nickname</label>
              <input 
                type="text" 
                className="glass-input" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Anonymous"
              />
            </div>
            <div className="input-group">
              <label>Room Name *</label>
              <input 
                type="text" 
                className="glass-input" 
                value={roomName} 
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. general, tech, gaming"
                required
              />
            </div>
            <button type="submit" className="join-button glass-button primary-button">Join Room</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="room-container">
      <div className="room-header glass-panel" style={{ borderRadius: '16px 16px 0 0', borderBottom: 'none' }}>
        <h2># {roomName}</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="user-count">
            <span className="count">{members.length}</span> Members
          </div>
          <button className="glass-button danger-button" onClick={handleLeaveGroup} style={{ padding: '0.4rem 1rem', borderRadius: '8px' }}>
            Leave Room
          </button>
        </div>
      </div>

      <div className="chat-room full-width-chat glass-panel" style={{ borderRadius: '0 0 16px 16px', borderTop: '1px solid var(--glass-border)' }}>
        <div className="chat-content">
          <div className="text-chat">
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat">Welcome to #{roomName}. Say hello!</div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.type === 'system' ? 'system' : (msg.isSelf ? 'sent' : 'received')}`}>
                    {msg.type !== 'system' && !msg.isSelf && (
                      <div className="message-nickname">{msg.nickname}</div>
                    )}
                    <div className="message-content">{msg.content}</div>
                    {msg.type !== 'system' && (
                      <div className="message-timestamp">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="glass-input message-input"
                placeholder="Message group..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
              />
              <button type="submit" className="glass-button primary-button send-button" disabled={!inputMessage.trim()}>
                Send
              </button>
            </form>
          </div>

          <div className="sidebar-members">
            <h3>Members Online</h3>
            <div className="member-list">
              {members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-avatar">
                    {member.nickname[0].toUpperCase()}
                  </div>
                  <span>{member.nickname} {member.id === socket.id ? '(You)' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
