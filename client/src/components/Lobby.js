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
    // Set up lobby event listeners
    socket.on('lobby-update', handleLobbyUpdate);
    socket.on('connect-request', handleConnectRequest);
    socket.on('request-accepted', handleRequestAccepted);
    
    // Clean up when component unmounts
    return () => {
      socket.off('lobby-update', handleLobbyUpdate);
      socket.off('connect-request', handleConnectRequest);
      socket.off('request-accepted', handleRequestAccepted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleLobbyUpdate = (users) => {
    // Filter out current user from the list
    const filteredUsers = users.filter(user => user.id !== socket.id);
    setLobbyUsers(filteredUsers);
  };
  
  const handleConnectRequest = (data) => {
    // Add to pending requests
    setPendingRequests(prev => [...prev, data]);
  };
  
  const handleRequestAccepted = (data) => {
    // Connection request was accepted, start chat with partner
    if (onConnect) {
      onConnect(data.partnerId, 'lobby');
    }
  };
  
  const joinLobby = (e) => {
    e.preventDefault();
    
    // Join lobby with nickname
    socket.emit('join-lobby', {
      nickname: nickname || 'Anonymous'
    });
    
    setIsJoined(true);
  };
  
  const sendConnectRequest = (userId) => {
    // Send connection request to user
    socket.emit('connect-request', userId);
    
    // Add to sent requests
    setSentRequests(prev => [...prev, userId]);
  };
  
  const acceptRequest = (request) => {
    // Accept connection request
    socket.emit('accept-request', request.from);
    
    // Remove from pending requests
    setPendingRequests(prev => prev.filter(req => req.from !== request.from));
    
    // Start chat with partner
    if (onConnect) {
      onConnect(request.from, 'lobby');
    }
  };
  
  const rejectRequest = (request) => {
    // Remove from pending requests
    setPendingRequests(prev => prev.filter(req => req.from !== request.from));
  };
  
  // Filter users based on search term
  const filteredUsers = searchTerm
    ? lobbyUsers.filter(user => 
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : lobbyUsers;
  
  if (!isJoined) {
    return (
      <div className="join-lobby-container">
        <div className="join-lobby-card">
          <h2>Join the Lobby</h2>
          <p className="join-description">
            Enter a nickname to join the lobby and connect with other users.
          </p>
          
          <form onSubmit={joinLobby} className="join-form">
            <div className="input-group">
              <label htmlFor="nickname">Your Nickname</label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your nickname"
                className="nickname-input"
              />
            </div>
            <button type="submit" className="join-button">
              Join Lobby
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="lobby-container">
      <div className="lobby-header">
        <h2>Lobby</h2>
        <div className="user-count">
          <span className="count">{lobbyUsers.length}</span> 
          <span className="count-label">Users Online</span>
        </div>
      </div>
      
      <div className="lobby-content">
        {/* Pending requests */}
        {pendingRequests.length > 0 && (
          <div className="requests-section">
            <h3>Chat Requests</h3>
            <div className="requests-list">
              {pendingRequests.map((request, index) => (
                <div key={index} className="request-card">
                  <div className="request-user">
                    <div className="user-avatar">
                      {(request.userData?.nickname || 'A')[0].toUpperCase()}
                    </div>
                    <div className="request-details">
                      <div className="request-name">
                        {request.userData?.nickname || 'Anonymous'}
                      </div>
                      <div className="request-message">
                        wants to chat with you
                      </div>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      onClick={() => acceptRequest(request)}
                      className="accept-button"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => rejectRequest(request)}
                      className="reject-button"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Search bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {/* User list */}
        <div className="users-section">
          <h3>Available Users</h3>
          
          <div className="users-list">
            {filteredUsers.length === 0 ? (
              <div className="empty-lobby">
                <p>No users available in the lobby</p>
                {searchTerm && <p>Try a different search term</p>}
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {(user.nickname || 'A')[0].toUpperCase()}
                    </div>
                    <div className="user-name">{user.nickname || 'Anonymous'}</div>
                  </div>
                  <button
                    onClick={() => sendConnectRequest(user.id)}
                    disabled={sentRequests.includes(user.id)}
                    className={`connect-button ${sentRequests.includes(user.id) ? 'sent' : ''}`}
                  >
                    {sentRequests.includes(user.id) ? 'Request Sent' : 'Connect'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <div className="lobby-footer">
        <p>You are in the lobby as <strong>{nickname || 'Anonymous'}</strong></p>
      </div>
    </div>
  );
};

export default Lobby; 