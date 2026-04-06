import React, { useState, useEffect } from 'react';
import socket from '../socket';

const Lobby = ({ onConnect }) => {
  const [lobbyUsers, setLobbyUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [nickname, setNickname] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    socket.on('lobby-update', handleLobbyUpdate);
    socket.on('connect-request', handleConnectRequest);
    socket.on('request-accepted', handleRequestAccepted);
    
    return () => {
      socket.off('lobby-update', handleLobbyUpdate);
      socket.off('connect-request', handleConnectRequest);
      socket.off('request-accepted', handleRequestAccepted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleLobbyUpdate = (users) => {
    setLobbyUsers(users.filter(user => user.id !== socket.id));
  };
  
  const handleConnectRequest = (data) => {
    setPendingRequests(prev => [...prev, data]);
  };
  
  const handleRequestAccepted = (data) => {
    if (onConnect) {
      onConnect(data.partnerId, 'lobby');
    }
  };
  
  const joinLobby = (e) => {
    e.preventDefault();
    socket.emit('join-lobby', {
      nickname: nickname || 'Anonymous'
    });
    setIsJoined(true);
  };
  
  const sendConnectRequest = (userId) => {
    socket.emit('connect-request', userId);
    setSentRequests(prev => [...prev, userId]);
  };
  
  const acceptRequest = (request) => {
    socket.emit('accept-request', request.from);
    setPendingRequests(prev => prev.filter(req => req.from !== request.from));
    if (onConnect) {
      onConnect(request.from, 'lobby');
    }
  };
  
  const rejectRequest = (request) => {
    setPendingRequests(prev => prev.filter(req => req.from !== request.from));
  };
  
  const filteredUsers = searchTerm
    ? lobbyUsers.filter(user => 
        (user.nickname || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    : lobbyUsers;
  
  if (!isJoined) {
    return (
      <div className="join-container">
        <div className="join-card glass-panel">
          <h2>Join the Lobby</h2>
          <p className="join-description">
            Enter a nickname to join the lobby and connect with other users online.
          </p>
          
          <form onSubmit={joinLobby}>
            <div className="input-group">
              <label htmlFor="nickname">Your Nickname</label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Explorer123"
                className="glass-input"
              />
            </div>
            <button type="submit" className="join-button glass-button primary-button">
              Join Lobby
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="room-container">
      <div className="room-header glass-panel" style={{ borderRadius: '16px 16px 0 0', borderBottom: 'none' }}>
        <h2>Lobby</h2>
        <div className="user-count">
          <span className="count">{lobbyUsers.length}</span> Users Online
        </div>
      </div>
      
      <div className="room-content glass-panel" style={{ borderRadius: '0 0 16px 16px', borderTop: '1px solid var(--glass-border)' }}>
        <div className="list-section">
          {pendingRequests.length > 0 && (
            <div className="requests-section">
              <h3>Chat Requests</h3>
              <div className="scrollable-list" style={{ maxHeight: '200px' }}>
                {pendingRequests.map((request, index) => (
                  <div key={index} className="list-item-card request-card glass-panel">
                    <div className="item-info">
                      <div className="item-avatar">
                        {(request.userData?.nickname || 'A')[0].toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="item-name">{request.userData?.nickname || 'Anonymous'}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>wants to chat</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => acceptRequest(request)} className="btn primary-button action-btn">Accept</button>
                      <button onClick={() => rejectRequest(request)} className="btn danger-button action-btn">Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input search-input"
            />
          </div>
          
          <h3>Available Users</h3>
          <div className="scrollable-list">
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <p>No users available in the lobby</p>
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="list-item-card">
                  <div className="item-info">
                    <div className="item-avatar">
                      {(user.nickname || 'A')[0].toUpperCase()}
                    </div>
                    <div className="item-name">{user.nickname || 'Anonymous'}</div>
                  </div>
                  <button
                    onClick={() => sendConnectRequest(user.id)}
                    disabled={sentRequests.includes(user.id)}
                    className={`btn action-btn glass-button ${!sentRequests.includes(user.id) ? 'primary-button' : ''}`}
                    style={sentRequests.includes(user.id) ? { background: 'rgba(255,255,255,0.1)' } : {}}
                  >
                    {sentRequests.includes(user.id) ? 'Request Sent' : 'Connect'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;