import { useState, useEffect, useCallback } from "react";
import { sounds } from "../lib/sounds";

// Check if running in Tauri
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  room_id: string;
  created_by: string;
  participants?: string[];
}

interface MeetingInvitation {
  id: string;
  meeting_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  room_id: string;
  inviter: string;
  participants?: string[];
}

export function useMeetingNotifications(userId: string) {
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [meetingInvitations, setMeetingInvitations] = useState<MeetingInvitation[]>([]);
  const [notifiedMeetings, setNotifiedMeetings] = useState<Set<string>>(new Set());
  const [startedMeetings, setStartedMeetings] = useState<Set<string>>(new Set());

  const checkUpcomingMeetings = useCallback(async (meetings: Meeting[]) => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const meetingReminders = localStorage.getItem("meetingReminders") !== "false";

    const upcoming = meetings.filter((meeting) => {
      const startTime = new Date(meeting.start_time).getTime();
      const timeUntilStart = startTime - now;
      
      // Show if meeting starts in 5 minutes or less, but hasn't started yet
      return timeUntilStart <= fiveMinutes && timeUntilStart > 0;
    });

    // Check for meetings that just started
    meetings.forEach((meeting) => {
      const startTime = new Date(meeting.start_time).getTime();
      const timeSinceStart = now - startTime;
      
      // If meeting started within the last 10 seconds and we haven't notified yet
      if (timeSinceStart >= 0 && timeSinceStart <= 10000 && !startedMeetings.has(meeting.id)) {
        const meetingReminders = localStorage.getItem("meetingReminders") !== "false";
        if (meetingReminders) {
          // Play meeting started sound
          sounds.meetingStarted();
          
          // Send notification
          if (isTauri) {
            import("@tauri-apps/plugin-notification").then(({ sendNotification }) => {
              return sendNotification({
                title: "Meeting Started",
                body: `${meeting.title} has started`,
              });
            }).catch(() => {});
          } else {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Meeting Started", {
                body: `${meeting.title} has started`,
                icon: new URL("../assets/icon.png", import.meta.url).href,
              });
            }
          }
          
          setStartedMeetings((prev) => new Set(prev).add(meeting.id));
        }
      }
    });

    // Check for new meetings that need notifications
    upcoming.forEach((meeting) => {
      if (!notifiedMeetings.has(meeting.id) && meetingReminders) {
        // Send desktop notification
        const timeUntilStart = Math.round((new Date(meeting.start_time).getTime() - now) / (1000 * 60));
        
        // Send notification
        if (isTauri) {
            import("@tauri-apps/plugin-notification").then(({ sendNotification }) => {
              return sendNotification({
                title: "Meeting Starting Soon",
                body: `${meeting.title} starts in ${timeUntilStart} minutes`,
              });
            }).catch(() => {});
        } else {
          // Browser fallback
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Meeting Starting Soon", {
              body: `${meeting.title} starts in ${timeUntilStart} minutes`,
              icon: new URL("../assets/icon.png", import.meta.url).href,
            });
          }
        }

        setNotifiedMeetings((prev) => new Set(prev).add(meeting.id));
      }
    });

    setUpcomingMeetings(upcoming);
  }, [notifiedMeetings]);

  const checkMeetingInvitations = useCallback(async () => {
    try {
      const { meetingsApi } = await import("../lib/api");
      const invitations = await meetingsApi.getInvitations();
      
      // Transform API response to MeetingInvitation format
      const formattedInvitations: MeetingInvitation[] = invitations.map((inv: any) => ({
        id: inv.id,
        meeting_id: inv.meeting_id,
        title: inv.title,
        description: inv.description,
        start_time: inv.start_time,
        end_time: inv.end_time,
        room_id: inv.room_id,
        inviter: inv.inviter_name || inv.inviter_email,
        participants: [], // Will be populated from meeting participants if needed
      }));
      
      setMeetingInvitations(formattedInvitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      setMeetingInvitations([]);
    }
  }, []);

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Check for invitations
    checkMeetingInvitations();

    // Function to check meetings
    const checkMeetings = async () => {
      try {
        const { meetingsApi } = await import("../lib/api");
        const allMeetings = await meetingsApi.getAll();
        
        // Transform API response to Meeting format
        const meetings: Meeting[] = allMeetings.map((m: any) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          start_time: m.start_time,
          end_time: m.end_time,
          room_id: m.room_id,
          created_by: m.created_by,
          participants: m.participants?.map((p: any) => p.name || p.email) || [],
        }));
        
        checkUpcomingMeetings(meetings);
      } catch (error) {
        console.error("Error fetching meetings:", error);
        setUpcomingMeetings([]);
      }
    };

    // Check immediately
    checkMeetings();

    // Check for upcoming meetings every minute
    const interval = setInterval(() => {
      checkMeetings();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userId, checkUpcomingMeetings, checkMeetingInvitations]);

  const dismissUpcoming = useCallback((meetingId: string) => {
    setUpcomingMeetings((prev) => prev.filter((m) => m.id !== meetingId));
  }, []);

  const dismissInvitation = useCallback((invitationId: string) => {
    setMeetingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
  }, []);

  const acceptInvitation = useCallback(async (invitationId: string) => {
    try {
      const { meetingsApi } = await import("../lib/api");
      await meetingsApi.acceptInvitation(invitationId);
      dismissInvitation(invitationId);
      
      // Trigger refresh of meetings list
      window.dispatchEvent(new CustomEvent('refreshMeetings'));
    } catch (error) {
      console.error("Error accepting invitation:", error);
    }
  }, [dismissInvitation]);

  const declineInvitation = useCallback(async (invitationId: string) => {
    try {
      const { meetingsApi } = await import("../lib/api");
      await meetingsApi.declineInvitation(invitationId);
      dismissInvitation(invitationId);
    } catch (error) {
      console.error("Error declining invitation:", error);
    }
  }, [dismissInvitation]);

  return {
    upcomingMeetings,
    meetingInvitations,
    dismissUpcoming,
    dismissInvitation,
    acceptInvitation,
    declineInvitation,
  };
}
