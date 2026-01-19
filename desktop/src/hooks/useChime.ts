import { useState, useCallback, useRef } from "react";
import { getAuthToken } from "../lib/api";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://summit.api.codingeverest.com";

export function useChime() {
  const [isConnected, setIsConnected] = useState(false);
  const [meeting, setMeeting] = useState<any>(null);
  const [attendee, setAttendee] = useState<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const connect = useCallback(async (roomName: string) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error("Not authenticated");

      // Create meeting
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

      const { meeting: meetingData } = await meetingResponse.json();
      setMeeting(meetingData);

      // Create attendee
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
      setIsConnected(true);

      console.log("Chime meeting created:", meetingData.MeetingId);
      
    } catch (error) {
      console.error("Failed to connect to Chime:", error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
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
  }, [meeting]);

  return {
    connect,
    disconnect,
    isConnected,
    meeting,
    attendee,
    audioElementRef,
    videoElementRef,
  };
}