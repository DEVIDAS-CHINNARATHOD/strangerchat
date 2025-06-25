import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';

const VideoChat = ({ partnerId, onEndChat }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [partnerNickname, setPartnerNickname] = useState('Stranger');
  const [isLocalFullscreen, setIsLocalFullscreen] = useState(false);
  const [isRemoteFullscreen, setIsRemoteFullscreen] = useState(false);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  
  // ICE servers configuration - expanded with more STUN/TURN servers
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
    ],
  };
  
  useEffect(() => {
    console.log('VideoChat component mounted, partnerId:', partnerId);
    // Start the video chat immediately when component mounts
    startVideoChat();
    
    // Set up WebRTC signaling event listeners
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('chat-ended', handleChatEnded);
    
    // Set a timeout to hide the connecting message after 10 seconds even if connection fails
    connectionTimeoutRef.current = setTimeout(() => {
      setIsConnecting(false);
    }, 10000);
    
    // Clean up when component unmounts
    return () => {
      stopVideoChat();
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('chat-ended', handleChatEnded);
      
      // Clear any interval
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);
  
  // Effect to monitor remote video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      console.log('Setting up remote video element monitoring');
      
      // Check if remote video is playing
      const checkRemoteVideo = () => {
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          try {
            console.log('Remote video dimensions:', 
              remoteVideoRef.current.videoWidth, 
              remoteVideoRef.current.videoHeight
            );
            
            if (remoteVideoRef.current.videoWidth > 0) {
              console.log('Remote video is displaying properly');
              setRemoteVideoReady(true);
              setIsConnecting(false);
              
              // Clear connection timeout since video is ready
              if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
              }
            } else {
              console.log('Remote video not displaying yet');
            }
          } catch (error) {
            console.error('Error checking remote video:', error);
          }
        }
      };
      
      // Set up periodic check for remote video
      checkIntervalRef.current = setInterval(checkRemoteVideo, 1000);
      
      return () => {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      };
    }
  }, []);
  
  const startVideoChat = async () => {
    try {
      console.log('Attempting to access camera and microphone...');
      // Get local media stream (camera and microphone)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      console.log('Camera and microphone access granted:', stream);
      
      // Save stream reference and display in local video element
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('Local video element set up with stream');
        
        // Add event listener to check if video is actually playing
        localVideoRef.current.onloadedmetadata = () => {
          if (localVideoRef.current) {
            console.log('Local video metadata loaded, playing video');
            localVideoRef.current.play().catch(e => console.error('Error playing local video:', e));
          }
        };
      } else {
        console.error('Local video reference is null');
      }
      
      // Create RTCPeerConnection
      createPeerConnection();
      
      // Add local tracks to the peer connection
      stream.getTracks().forEach(track => {
        if (peerConnectionRef.current) {
          console.log('Adding track to peer connection:', track.kind);
          peerConnectionRef.current.addTrack(track, stream);
        }
      });
      
      // If we have a partner ID, we should initiate the call
      if (partnerId) {
        console.log('Partner ID available, creating offer');
        createOffer();
      }
      
      setCameraError(null);
    } catch (error) {
      console.error('Error starting video chat:', error);
      setIsConnecting(false);
      setCameraError(error.message || 'Could not access camera or microphone');
      
      // Clear connection timeout since we have an error
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    }
  };
  
  const createPeerConnection = () => {
    // Create new RTCPeerConnection
    peerConnectionRef.current = new RTCPeerConnection(iceServers);
    console.log('Peer connection created with config:', iceServers);
    
    // Handle ICE candidate events
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && partnerId) {
        console.log('ICE candidate generated:', event.candidate);
        socket.emit('ice-candidate', {
          target: partnerId,
          candidate: event.candidate,
        });
      }
    };
    
    // Handle connection state changes
    peerConnectionRef.current.onconnectionstatechange = () => {
      // Add null check before accessing connectionState
      if (peerConnectionRef.current) {
        console.log('Connection state:', peerConnectionRef.current.connectionState);
        
        // Handle different connection states
        if (peerConnectionRef.current.connectionState === 'connected') {
          console.log('WebRTC connection established successfully');
          setIsConnecting(false);
          
          // Clear connection timeout since connection is established
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        } else if (peerConnectionRef.current.connectionState === 'failed') {
          console.error('WebRTC connection failed');
          setIsConnecting(false);
          setCameraError('Connection failed. Please try again.');
          
          // Clear connection timeout since we have an error
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
          }
        }
      }
    };
    
    // Handle ICE connection state changes
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      if (peerConnectionRef.current) {
        console.log('ICE connection state:', peerConnectionRef.current.iceConnectionState);
        
        // Handle ICE connection failures
        if (peerConnectionRef.current.iceConnectionState === 'failed') {
          console.error('ICE connection failed');
          setIsConnecting(false);
          
          // Consider restarting ICE
          if (peerConnectionRef.current) {
            console.log('Attempting to restart ICE');
            peerConnectionRef.current.restartIce();
          }
        } else if (peerConnectionRef.current.iceConnectionState === 'connected' || 
                  peerConnectionRef.current.iceConnectionState === 'completed') {
          setIsConnecting(false);
        }
      }
    };
    
    // Handle negotiation needed events
    peerConnectionRef.current.onnegotiationneeded = () => {
      console.log('Negotiation needed event');
      if (partnerId && peerConnectionRef.current) {
        createOffer();
      }
    };
    
    // Handle receiving remote tracks
    peerConnectionRef.current.ontrack = (event) => {
      console.log('Remote track received:', event);
      if (remoteVideoRef.current && event.streams[0]) {
        console.log('Setting remote video stream');
        remoteVideoRef.current.srcObject = event.streams[0];
        remoteStreamRef.current = event.streams[0];
        
        // Add event listener to check if video is actually playing
        remoteVideoRef.current.onloadedmetadata = () => {
          if (remoteVideoRef.current) {
            console.log('Remote video metadata loaded, playing video');
            remoteVideoRef.current.play()
              .then(() => {
                console.log('Remote video playing successfully');
                setIsConnecting(false);
                setRemoteVideoReady(true);
                
                // Clear connection timeout since video is playing
                if (connectionTimeoutRef.current) {
                  clearTimeout(connectionTimeoutRef.current);
                  connectionTimeoutRef.current = null;
                }
              })
              .catch(e => {
                console.error('Error playing remote video:', e);
                // Try playing again with user interaction
                if (remoteVideoRef.current) {
                  const playPromise = remoteVideoRef.current.play();
                  if (playPromise !== undefined) {
                    playPromise.catch(error => {
                      console.log('Autoplay prevented, waiting for user interaction');
                    });
                  }
                }
              });
          }
        };
        
        // Additional event listeners for remote video
        remoteVideoRef.current.onloadeddata = () => {
          console.log('Remote video data loaded');
          setIsConnecting(false);
        };
        
        remoteVideoRef.current.onresize = () => {
          if (remoteVideoRef.current) {
            try {
              console.log('Remote video resized:', 
                remoteVideoRef.current.videoWidth, 
                remoteVideoRef.current.videoHeight
              );
            } catch (error) {
              console.error('Error accessing remote video properties:', error);
            }
          }
        };
        
        // Check if the stream has video tracks
        const videoTracks = event.streams[0].getVideoTracks();
        if (videoTracks.length > 0) {
          console.log('Remote stream has video tracks:', videoTracks.length);
          
          // Monitor video track state
          videoTracks.forEach(track => {
            console.log('Video track settings:', track.getSettings());
            console.log('Video track constraints:', track.getConstraints());
            console.log('Video track enabled:', track.enabled);
            
            track.onmute = () => console.log('Remote video track muted');
            track.onunmute = () => console.log('Remote video track unmuted');
            track.onended = () => console.log('Remote video track ended');
          });
        } else {
          console.warn('Remote stream has no video tracks');
        }
      } else {
        console.error('Remote video reference is null or no streams available');
      }
    };
  };
  
  const createOffer = async () => {
    try {
      if (!peerConnectionRef.current) {
        console.error('Cannot create offer: peer connection is null');
        return;
      }
      
      // Create offer
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log('Offer created:', offer);
      
      // Set local description
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('Local description set');
      
      // Send offer to peer via signaling server
      socket.emit('offer', {
        target: partnerId,
        offer: offer,
      });
      console.log('Offer sent to partner:', partnerId);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };
  
  const handleOffer = async (data) => {
    try {
      console.log('Offer received from:', data.from);
      
      // Create peer connection if it doesn't exist
      if (!peerConnectionRef.current) {
        console.log('Creating peer connection for received offer');
        createPeerConnection();
      }
      
      // Set remote description from received offer
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
      console.log('Remote description set from offer');
      
      // Create answer
      const answer = await peerConnectionRef.current.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      console.log('Answer created');
      
      // Set local description
      await peerConnectionRef.current.setLocalDescription(answer);
      console.log('Local description set for answer');
      
      // Send answer to peer via signaling server
      socket.emit('answer', {
        target: data.from,
        answer: answer,
      });
      console.log('Answer sent to:', data.from);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };
  
  const handleAnswer = async (data) => {
    try {
      console.log('Answer received from:', data.from);
      
      if (!peerConnectionRef.current) {
        console.error('Cannot handle answer: peer connection is null');
        return;
      }
      
      // Set remote description from received answer
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Remote description set from answer');
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };
  
  const handleIceCandidate = async (data) => {
    try {
      console.log('ICE candidate received from:', data.from);
      
      // Add received ICE candidate
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('ICE candidate added');
      } else {
        console.error('Cannot add ICE candidate: peer connection is null');
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  const handleUserDisconnected = (userId) => {
    if (userId === partnerId) {
      console.log('Partner disconnected:', userId);
      // Partner disconnected, end chat
      handleChatEnded();
    }
  };
  
  const handleChatEnded = (action = 'home') => {
    console.log('Chat ended, action:', action);
    // Clean up resources before notifying parent
    cleanupResources();
    
    // Notify parent component that chat has ended with action
    if (onEndChat) {
      onEndChat(action);
    }
  };
  
  // Clean up resources separately to ensure it happens before component unmounts
  const cleanupResources = () => {
    // Clear any interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Remove event listeners from video elements
    if (localVideoRef.current) {
      localVideoRef.current.onloadedmetadata = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.onloadedmetadata = null;
      remoteVideoRef.current.onloadeddata = null;
      remoteVideoRef.current.onresize = null;
    }
    
    stopVideoChat();
  };
  
  const stopVideoChat = () => {
    console.log('Stopping video chat');
    
    // Stop all tracks in local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Stop all tracks in remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Remote track stopped:', track.kind);
      });
      remoteStreamRef.current = null;
    }
    
    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
      console.log('Peer connection closed');
    }
  };
  
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log('Audio track enabled:', track.enabled);
      });
      setIsMuted(!isMuted);
    }
  };
  
  const endChat = () => {
    console.log('End chat requested');
    // Send end chat signal to partner
    socket.emit('end-chat', partnerId);
    // End chat locally with flag to go home
    handleChatEnded('home');
  };
  
  const nextChat = () => {
    console.log('Next chat requested');
    // Send end chat signal to partner
    socket.emit('end-chat', partnerId);
    // End chat locally with flag to find next match
    handleChatEnded('next');
  };
  
  // Retry camera access
  const retryCamera = () => {
    console.log('Retrying camera access');
    setCameraError(null);
    setIsConnecting(true);
    startVideoChat();
  };
  
  // Toggle fullscreen mode for local video
  const toggleLocalFullscreen = () => {
    // If remote is fullscreen, exit that first
    if (isRemoteFullscreen) {
      setIsRemoteFullscreen(false);
    }
    setIsLocalFullscreen(!isLocalFullscreen);
    console.log('Local fullscreen mode:', !isLocalFullscreen);
  };
  
  // Toggle fullscreen mode for remote video
  const toggleRemoteFullscreen = () => {
    // If local is fullscreen, exit that first
    if (isLocalFullscreen) {
      setIsLocalFullscreen(false);
    }
    setIsRemoteFullscreen(!isRemoteFullscreen);
    console.log('Remote fullscreen mode:', !isRemoteFullscreen);
  };
  
  // Force refresh of remote video
  const refreshRemoteVideo = () => {
    console.log('Manually refreshing remote video');
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      const currentStream = remoteVideoRef.current.srcObject;
      remoteVideoRef.current.srcObject = null;
      setTimeout(() => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = currentStream;
          remoteVideoRef.current.play().catch(e => console.error('Error playing remote video:', e));
        }
      }, 100);
    }
  };
  
  return (
    <div className="video-chat-container">
      {cameraError ? (
        <div className="camera-error">
          <div className="error-message">
            <h3>Camera Error</h3>
            <p>{cameraError}</p>
            <p>Please make sure your camera and microphone are connected and you've given permission to use them.</p>
            <button onClick={retryCamera} className="retry-button">
              Retry Camera Access
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {/* Remote video (larger) */}
            <div 
              className={`remote-video-container ${isRemoteFullscreen ? 'fullscreen' : ''}`}
              onClick={toggleRemoteFullscreen}
            >
              {isConnecting && <div className="connecting-message">Connecting...</div>}
              <video 
                ref={remoteVideoRef} 
                className="remote-video" 
                autoPlay 
                playsInline
              />
              {!remoteVideoReady && !isConnecting && (
                <div className="video-status">
                  <p>Waiting for stranger's video...</p>
                  <button onClick={refreshRemoteVideo} className="refresh-video-button">
                    Refresh Video
                  </button>
                </div>
              )}
              <div className="video-label stranger-label">{partnerNickname}'s Video</div>
              <button 
                className="fullscreen-toggle" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRemoteFullscreen();
                }}
              >
                {isRemoteFullscreen ? '×' : '⤢'}
              </button>
            </div>
            
            {/* Local video (smaller, picture-in-picture) */}
            <div 
              className={`local-video-container ${isLocalFullscreen ? 'fullscreen' : ''}`}
              onClick={toggleLocalFullscreen}
            >
              <video 
                ref={localVideoRef} 
                className="local-video" 
                autoPlay 
                playsInline 
                muted // Always mute local video to prevent feedback
              />
              <div className="video-label self-label">Your Video</div>
              <button 
                className="fullscreen-toggle" 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLocalFullscreen();
                }}
              >
                {isLocalFullscreen ? '×' : '⤢'}
              </button>
            </div>
          </div>
          
          {/* Video controls */}
          <div className="video-controls">
            <button 
              className={`control-button ${isMuted ? 'muted' : ''}`}
              onClick={toggleMute}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
            
            <button 
              className="control-button end-button"
              onClick={endChat}
            >
              End Chat
            </button>
            
            <button 
              className="control-button next-button"
              onClick={nextChat}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VideoChat; 