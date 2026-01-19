import { useState, useCallback, useRef } from "react";

export function useWebRTC() {
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const connect = useCallback(async (roomName: string) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      setIsConnected(true);
      
      // Create peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

    } catch (error) {
      console.error("WebRTC connection failed:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    setRemoteStream(null);
    setIsConnected(false);
  }, [localStream]);

  return {
    connect,
    disconnect,
    isConnected,
    localStream,
    remoteStream
  };
}