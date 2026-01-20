import { useState, useCallback, useRef, useEffect } from "react";
import { getAuthToken } from "../lib/api";
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  AudioVideoObserver,
  VideoTileState,
} from "amazon-chime-sdk-js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://summit.api.codingeverest.com";

export function useChime() {
  const [isConnected, setIsConnected] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [remoteVideoTiles, setRemoteVideoTiles] = useState<Map<number, string>>(new Map());
  
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const deviceControllerRef = useRef<DefaultDeviceController | null>(null);
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const isConnectingRef = useRef(false);

  // Initialize device controller
  useEffect(() => {
    const logger = new ConsoleLogger("ChimeSDK", LogLevel.WARN);
    deviceControllerRef.current = new DefaultDeviceController(logger);
    
    return () => {
      if (meetingSessionRef.current) {
        meetingSessionRef.current.audioVideo.stop();
      }
    };
  }, []);

  const connect = useCallback(async (roomName: string) => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      console.log("Already connecting, ignoring duplicate request");
      return;
    }

    // If already connected to this room, don't reconnect
    if (isConnected && meetingSessionRef.current) {
      console.log("Already connected to meeting");
      return;
    }

    isConnectingRef.current = true;

    try {
      const token = getAuthToken();
      if (!token) throw new Error("Not authenticated");

      console.log("Checking for existing Chime meeting for room:", roomName);

      // First, check if a meeting already exists for this room
      let meetingData;
      try {
        const existingMeetingResponse = await fetch(`${SERVER_URL}/api/chime/meeting/${roomName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (existingMeetingResponse.ok) {
          const { meeting: existingMeeting } = await existingMeetingResponse.json();
          meetingData = existingMeeting;
          console.log("Joining existing meeting:", meetingData.meetingId);
        }
      } catch (error) {
        // Meeting doesn't exist, will create new one
        console.log("No existing meeting found, creating new one");
      }

      // If no existing meeting, create a new one
      if (!meetingData) {
        console.log("Creating new Chime meeting for room:", roomName);
        const meetingResponse = await fetch(`${SERVER_URL}/api/chime/meeting`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ chatId: roomName }),
        });

        if (!meetingResponse.ok) {
          const error = await meetingResponse.json();
          throw new Error(error.error || "Failed to create meeting");
        }

        const response = await meetingResponse.json();
        meetingData = response.meeting;
        console.log("Meeting created:", meetingData.MeetingId);
      }

      setMeeting(meetingData);

      // Create attendee for this meeting
      const attendeeResponse = await fetch(`${SERVER_URL}/api/chime/attendee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ meetingId: meetingData.MeetingId || meetingData.meetingId }),
      });

      if (!attendeeResponse.ok) {
        const error = await attendeeResponse.json();
        throw new Error(error.error || "Failed to join meeting");
      }

      const { attendee: attendeeData } = await attendeeResponse.json();
      setAttendee(attendeeData);
      console.log("Attendee created:", attendeeData.AttendeeId);

      // Create meeting session
      const logger = new ConsoleLogger("ChimeSDK", LogLevel.WARN);
      const configuration = new MeetingSessionConfiguration(meetingData, attendeeData);
      const meetingSession = new DefaultMeetingSession(
        configuration,
        logger,
        deviceControllerRef.current!
      );
      meetingSessionRef.current = meetingSession;

      // Set up audio/video observers
      const observer: AudioVideoObserver = {
        videoTileDidUpdate: (tileState: VideoTileState) => {
          console.log("Video tile updated:", tileState.tileId, "Local:", tileState.localTile);
          
          if (!tileState.boundVideoElement) {
            if (tileState.localTile && localVideoElementRef.current) {
              // Bind local video
              meetingSession.audioVideo.bindVideoElement(
                tileState.tileId,
                localVideoElementRef.current
              );
            } else if (!tileState.localTile) {
              // Remote video tile - store for rendering
              setRemoteVideoTiles((prev) => {
                const newMap = new Map(prev);
                newMap.set(tileState.tileId, tileState.boundAttendeeId || "");
                return newMap;
              });
            }
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          console.log("Video tile removed:", tileId);
          setRemoteVideoTiles((prev) => {
            const newMap = new Map(prev);
            newMap.delete(tileId);
            return newMap;
          });
        },
      };

      meetingSession.audioVideo.addObserver(observer);

      // Start audio
      const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
      if (audioInputDevices.length > 0) {
        await meetingSession.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
      }

      // Bind audio output
      const audioOutputElement = document.getElementById("chime-audio-output") as HTMLAudioElement;
      if (audioOutputElement) {
        await meetingSession.audioVideo.bindAudioElement(audioOutputElement);
      }

      // Start the session
      meetingSession.audioVideo.start();
      setIsConnected(true);
      isConnectingRef.current = false;
      console.log("Chime session started successfully");
      
    } catch (error) {
      isConnectingRef.current = false;
      console.error("Failed to connect to Chime:", error);
      throw error;
    }
  }, [isConnected]);

  const disconnect = useCallback(async () => {
    isConnectingRef.current = false;
    
    if (meetingSessionRef.current) {
      // Stop video input to turn off camera
      try {
        meetingSessionRef.current.audioVideo.stopVideoInput();
        meetingSessionRef.current.audioVideo.stopLocalVideoTile();
      } catch (error) {
        console.error("Error stopping video:", error);
      }
      
      meetingSessionRef.current.audioVideo.stop();
      meetingSessionRef.current = null;
    }

    if (meeting) {
      try {
        const token = getAuthToken();
        await fetch(`${SERVER_URL}/api/chime/meeting/${meeting.MeetingId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Error ending meeting:", error);
      }
    }
    
    setMeeting(null);
    setAttendee(null);
    setIsConnected(false);
    setRemoteVideoTiles(new Map());
    setVideoEnabled(false);
    setAudioEnabled(true);
  }, [meeting]);

  const toggleAudio = useCallback(async () => {
    if (!meetingSessionRef.current) return;

    if (audioEnabled) {
      meetingSessionRef.current.audioVideo.realtimeMuteLocalAudio();
    } else {
      meetingSessionRef.current.audioVideo.realtimeUnmuteLocalAudio();
    }
    setAudioEnabled(!audioEnabled);
  }, [audioEnabled]);

  const toggleVideo = useCallback(async () => {
    if (!meetingSessionRef.current) return;

    try {
      if (videoEnabled) {
        meetingSessionRef.current.audioVideo.stopLocalVideoTile();
        setVideoEnabled(false);
      } else {
        const videoInputDevices = await meetingSessionRef.current.audioVideo.listVideoInputDevices();
        if (videoInputDevices.length > 0) {
          await meetingSessionRef.current.audioVideo.startVideoInput(videoInputDevices[0].deviceId);
          meetingSessionRef.current.audioVideo.startLocalVideoTile();
          setVideoEnabled(true);
        }
      }
    } catch (error) {
      console.error("Error toggling video:", error);
    }
  }, [videoEnabled]);

  const bindVideoElement = useCallback((tileId: number, videoElement: HTMLVideoElement) => {
    if (meetingSessionRef.current) {
      meetingSessionRef.current.audioVideo.bindVideoElement(tileId, videoElement);
    }
  }, []);

  return {
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
    bindVideoElement,
    isConnected,
    meeting,
    attendee,
    audioEnabled,
    videoEnabled,
    remoteVideoTiles,
    localVideoElementRef,
  };
}