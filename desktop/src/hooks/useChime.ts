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

// Track remote attendees (with or without video)
interface RemoteAttendee {
  attendeeId: string;
  externalUserId: string;
  hasVideo: boolean;
  tileId?: number;
}

export function useChime(onConnected?: () => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [remoteVideoTiles, setRemoteVideoTiles] = useState<Map<number, string>>(new Map());
  const [remoteAttendees, setRemoteAttendees] = useState<Map<string, RemoteAttendee>>(new Map());
  
  const meetingSessionRef = useRef<DefaultMeetingSession | null>(null);
  const deviceControllerRef = useRef<DefaultDeviceController | null>(null);
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const isConnectingRef = useRef(false);

  // Initialize device controller
  useEffect(() => {
    const logger = new ConsoleLogger("ChimeSDK", LogLevel.WARN);
    try {
      deviceControllerRef.current = new DefaultDeviceController(logger);
    } catch (error) {
      console.error("Error creating device controller:", error);
      // Create a basic device controller anyway - it will work without devices
      deviceControllerRef.current = new DefaultDeviceController(logger);
    }
    
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
          // The backend returns the meeting with MeetingId (uppercase)
          if (existingMeeting && existingMeeting.MeetingId) {
            meetingData = existingMeeting;
            console.log("Joining existing meeting:", meetingData.MeetingId);
          }
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

      // Validate meeting data has required fields
      if (!meetingData.MeetingId || !meetingData.MediaPlacement) {
        console.error("Invalid meeting data:", meetingData);
        throw new Error("Meeting data is missing required fields (MeetingId or MediaPlacement)");
      }

      setMeeting(meetingData);
      console.log("Meeting data validated:", {
        MeetingId: meetingData.MeetingId,
        hasMediaPlacement: !!meetingData.MediaPlacement,
      });

      // Create attendee for this meeting
      const attendeeResponse = await fetch(`${SERVER_URL}/api/chime/attendee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ meetingId: meetingData.MeetingId }),
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
      
      // Ensure device controller exists
      if (!deviceControllerRef.current) {
        console.log("Creating device controller on demand");
        deviceControllerRef.current = new DefaultDeviceController(logger);
      }
      
      const meetingSession = new DefaultMeetingSession(
        configuration,
        logger,
        deviceControllerRef.current
      );
      meetingSessionRef.current = meetingSession;

      // Set up audio/video observers
      const observer: AudioVideoObserver = {
        videoTileDidUpdate: (tileState: VideoTileState) => {
          console.log("Video tile updated:", tileState.tileId, "Local:", tileState.localTile, "AttendeeId:", tileState.boundAttendeeId);
          
          if (!tileState.boundVideoElement) {
            if (tileState.localTile && localVideoElementRef.current) {
              // Bind local video
              meetingSession.audioVideo.bindVideoElement(
                tileState.tileId,
                localVideoElementRef.current
              );
            } else if (!tileState.localTile && tileState.boundAttendeeId) {
              // Remote video tile - store for rendering
              setRemoteVideoTiles((prev) => {
                const newMap = new Map(prev);
                newMap.set(tileState.tileId, tileState.boundAttendeeId || "");
                return newMap;
              });
              
              // Update attendee to show they have video
              setRemoteAttendees((prev) => {
                const newMap = new Map(prev);
                const existing = newMap.get(tileState.boundAttendeeId!) || {
                  attendeeId: tileState.boundAttendeeId!,
                  externalUserId: "",
                  hasVideo: false,
                };
                newMap.set(tileState.boundAttendeeId!, {
                  ...existing,
                  hasVideo: true,
                  tileId: tileState.tileId,
                });
                return newMap;
              });
            }
          }
        },
        videoTileWasRemoved: (tileId: number) => {
          console.log("Video tile removed:", tileId);
          setRemoteVideoTiles((prev) => {
            const newMap = new Map(prev);
            const attendeeId = prev.get(tileId);
            newMap.delete(tileId);
            
            // Update attendee to show they no longer have video
            if (attendeeId) {
              setRemoteAttendees((prevAttendees) => {
                const newAttendees = new Map(prevAttendees);
                const existing = newAttendees.get(attendeeId);
                if (existing) {
                  newAttendees.set(attendeeId, { ...existing, hasVideo: false, tileId: undefined });
                }
                return newAttendees;
              });
            }
            
            return newMap;
          });
        },
        audioVideoDidStart: () => {
          console.log("Audio/Video started - meeting is active");
        },
        audioVideoDidStop: (sessionStatus) => {
          console.log("Audio/Video stopped:", sessionStatus);
        },
      };

      meetingSession.audioVideo.addObserver(observer);
      
      // Store our own attendee ID for filtering
      const myAttendeeId = attendeeData.AttendeeId;
      console.log("My attendee ID:", myAttendeeId);
      
      // Subscribe to attendee presence changes
      meetingSession.audioVideo.realtimeSubscribeToAttendeeIdPresence(
        (attendeeId: string, present: boolean, externalUserId?: string) => {
          console.log("👥 Attendee presence changed:", attendeeId, "present:", present, "externalUserId:", externalUserId, "isMe:", attendeeId === myAttendeeId);
          
          // Don't add ourselves
          if (attendeeId === myAttendeeId) {
            console.log("Skipping self attendee");
            return;
          }
          
          if (present) {
            // Attendee joined
            setRemoteAttendees((prev) => {
              const newMap = new Map(prev);
              newMap.set(attendeeId, {
                attendeeId,
                externalUserId: externalUserId || "",
                hasVideo: false,
              });
              console.log("✅ Remote attendee joined:", attendeeId, "Total remote:", newMap.size);
              return newMap;
            });
          } else {
            // Attendee left
            setRemoteAttendees((prev) => {
              const newMap = new Map(prev);
              newMap.delete(attendeeId);
              console.log("❌ Remote attendee left:", attendeeId, "Total remote:", newMap.size);
              return newMap;
            });
          }
        }
      );
      
      // Also subscribe to volume indicator to detect attendees (backup method)
      // Note: In Chime SDK, we subscribe to all attendees by passing the callback
      const volumeCallback = (attendeeId: string, volume: number | null, muted: boolean | null, signalStrength: number | null) => {
        // Only log occasionally to avoid spam
        if (volume && volume > 0) {
          console.log("🔊 Volume from attendee:", attendeeId, "volume:", volume);
        }
        
        // If we detect volume from someone else, make sure they're in our attendees list
        if (attendeeId !== myAttendeeId) {
          setRemoteAttendees((prev) => {
            if (!prev.has(attendeeId)) {
              const newMap = new Map(prev);
              newMap.set(attendeeId, {
                attendeeId,
                externalUserId: "",
                hasVideo: false,
              });
              console.log("✅ Added attendee via volume indicator:", attendeeId);
              return newMap;
            }
            return prev;
          });
        }
      };
      
      // Subscribe to volume for all attendees
      meetingSession.audioVideo.realtimeSubscribeToVolumeIndicator(myAttendeeId, volumeCallback);

      // Start audio input (microphone) - wrapped in try-catch to not block joining
      try {
        // Request microphone permission first
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (permError) {
          console.warn("Microphone permission not granted:", permError);
          // Continue anyway - user can still hear others
        }
        
        const audioInputDevices = await meetingSession.audioVideo.listAudioInputDevices();
        console.log("Audio input devices:", audioInputDevices.length);
        if (audioInputDevices.length > 0) {
          await meetingSession.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
          console.log("Audio input started:", audioInputDevices[0].label);
        } else {
          console.warn("No audio input devices found - call will work but you won't be heard");
        }
      } catch (deviceError: any) {
        console.error("Error accessing microphone:", deviceError);
        // Don't fail the call - continue without microphone
        // The user can still hear others
        if (deviceError.name === "NotAllowedError" || deviceError.message?.includes("Permission")) {
          console.warn("Microphone permission denied - please allow microphone access in your browser settings");
        }
      }

      // Set up audio output device
      try {
        const audioOutputDevices = await meetingSession.audioVideo.listAudioOutputDevices();
        console.log("Audio output devices:", audioOutputDevices.length);
        if (audioOutputDevices.length > 0) {
          try {
            await meetingSession.audioVideo.chooseAudioOutput(audioOutputDevices[0].deviceId);
            console.log("Audio output device selected:", audioOutputDevices[0].label);
          } catch (outputError) {
            console.warn("Could not select audio output device:", outputError);
          }
        }
      } catch (outputListError) {
        console.warn("Could not list audio output devices:", outputListError);
      }

      // Start the session FIRST (before binding audio output)
      meetingSession.audioVideo.start();
      console.log("Meeting session started");

      // Bind audio output AFTER session starts
      // Wait a moment for the audio element to be ready
      setTimeout(async () => {
        const audioOutputElement = document.getElementById("chime-audio-output") as HTMLAudioElement;
        if (audioOutputElement) {
          try {
            // Set up the audio element properly
            audioOutputElement.autoplay = true;
            audioOutputElement.muted = false;
            
            // Try to play (may be blocked by autoplay policy)
            const playPromise = audioOutputElement.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.log("Audio autoplay blocked, will play on user interaction:", e.message);
                // Add a one-time click handler to resume audio
                const resumeAudio = async () => {
                  try {
                    await audioOutputElement.play();
                    console.log("Audio resumed after user interaction");
                  } catch (err) {
                    console.error("Failed to resume audio:", err);
                  }
                  document.removeEventListener("click", resumeAudio);
                };
                document.addEventListener("click", resumeAudio, { once: true });
              });
            }
            
            await meetingSession.audioVideo.bindAudioElement(audioOutputElement);
            console.log("Audio output bound successfully");
          } catch (audioError) {
            console.error("Failed to bind audio output:", audioError);
          }
        } else {
          console.error("Audio output element not found! Make sure <audio id='chime-audio-output'> exists");
        }
      }, 500);
      
      // Set connected state immediately
      setIsConnected(true);
      isConnectingRef.current = false;
      console.log("Chime session started successfully");
      console.log("Meeting ID:", meetingData.MeetingId);
      console.log("Attendee ID:", attendeeData.AttendeeId);
      
      // Call onConnected callback if provided
      if (onConnected) {
        console.log("Calling onConnected callback");
        onConnected();
      }
      
    } catch (error) {
      isConnectingRef.current = false;
      console.error("Failed to connect to Chime:", error);
      console.error("Error details:", error);
      throw error;
    }
  }, [isConnected]);

  const disconnect = useCallback(async () => {
    isConnectingRef.current = false;
    
    if (meetingSessionRef.current) {
      try {
        // Stop audio input first (this removes the red recording indicator)
        await meetingSessionRef.current.audioVideo.stopAudioInput();
        console.log("Audio input stopped");
      } catch (error) {
        console.error("Error stopping audio input:", error);
      }
      
      // Stop video input to turn off camera
      try {
        await meetingSessionRef.current.audioVideo.stopVideoInput();
        meetingSessionRef.current.audioVideo.stopLocalVideoTile();
        console.log("Video input stopped");
      } catch (error) {
        console.error("Error stopping video:", error);
      }
      
      // Stop the session
      try {
        meetingSessionRef.current.audioVideo.stop();
        console.log("Meeting session stopped");
      } catch (error) {
        console.error("Error stopping session:", error);
      }
      
      meetingSessionRef.current = null;
    }

    // DON'T delete the meeting - let it expire naturally or let the backend clean it up
    // This allows other participants to join even after one person leaves
    console.log("Disconnected from meeting, but leaving it active for other participants");
    
    setMeeting(null);
    setAttendee(null);
    setIsConnected(false);
    setRemoteVideoTiles(new Map());
    setRemoteAttendees(new Map());
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
    remoteAttendees,
    localVideoElementRef,
  };
}