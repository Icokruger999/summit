export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  room_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingParticipant {
  meeting_id: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "file";
  fileUrl?: string;
  fileName?: string;
}

export interface FileAttachment {
  url: string;
  fileName: string;
  size: number;
  type: string;
}

