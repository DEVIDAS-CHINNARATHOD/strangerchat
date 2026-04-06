import React, { useEffect, useRef, useState } from 'react';
import socket from '../socket';

const VideoChat = ({ partnerId, isInitiator }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const [hasVideo, setHasVideo] = useState(true);
  const [hasAudio, setHasAudio] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, failed
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    // Setup WebRTC connection
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    peerConnectionRef.current = new RTCPeerConnection(configuration);
    const pc = peerConnectionRef.current;
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          target: partnerId,
          candidate: event.candidate
        });
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnectionStatus('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setConnectionStatus('failed');
      }
    };
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        stream.getTracks().forEach(track => {
          if (peerConnectionRef.current) {
             peerConnectionRef.current.addTrack(track, stream);
          }
        });
        
        if (isInitiator) {
          createOffer();
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setCameraError('Permission denied or no camera found.');
        setConnectionStatus('failed');
      }
    };
    
    startMedia();
    
    // Socket events for WebRTC signaling
    const handleOffer = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('answer', { target: data.from, answer });
      } catch (e) {
        console.error('Error handling offer:', e);
      }
    };
    
    const handleAnswer = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (e) {
        console.error('Error handling answer:', e);
      }
    };
    
    const handleIceCandidate = async (data) => {
      if (!peerConnectionRef.current) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding ice candidate:', e);
      }
    };
    
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    
    return () => {
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, isInitiator]);
  
  const createOffer = async () => {
    if (!peerConnectionRef.current) return;
    try {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit('offer', { target: partnerId, offer });
    } catch (e) {
      console.error('Error creating offer:', e);
    }
  };
  
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setHasVideo(videoTrack.enabled);
      }
    }
  };
  
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setHasAudio(audioTrack.enabled);
      }
    }
  };
  
  return (
    <div className="remote-video-container">
      {connectionStatus === 'connecting' && !cameraError && (
        <div className="connecting-message gass-panel" style={{ background: 'rgba(0,0,0,0.6)', padding: '1rem', borderRadius: '8px' }}>
          <div className="spinner" style={{ width: '30px', height: '30px', marginBottom: '1rem' }}></div>
          <p>Connecting to partner video...</p>
        </div>
      )}

      {cameraError && (
        <div className="camera-error">
          <p style={{ color: 'var(--accent-red)' }}>{cameraError}</p>
        </div>
      )}

      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        className="remote-video"
      />
      
      <div className="local-video-container">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className="local-video"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div className="video-label">You</div>
      </div>
      
      <div className="video-controls glass-panel" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <button 
          onClick={toggleAudio}
          className={`glass-button btn ${!hasAudio ? 'danger-button' : ''}`}
          style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0 }}
        >
          {hasAudio ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path><path d="M5 10v2a7 7 0 0 0 12 5l-1.5 1.5a5 5 0 0 1-9-5v-2"></path><path d="M12 18.934V22"></path><path d="M8 22h8"></path><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path><path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path></svg>
          )}
        </button>
        <button 
          onClick={toggleVideo}
          className={`glass-button btn ${!hasVideo ? 'danger-button' : ''}`}
          style={{ borderRadius: '50%', width: '45px', height: '45px', padding: 0 }}
        >
          {hasVideo ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default VideoChat;