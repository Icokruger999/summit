// Simple in-memory WebSocket notification system for real-time messages
import { WebSocket } from "ws";

interface Client {
  userId: string;
  ws: WebSocket;
}

class MessageNotifier {
  private clients: Map<string, Set<WebSocket>> = new Map();

  // Register a user's WebSocket connection
  addClient(userId: string, ws: WebSocket) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    console.log(`✅ WebSocket connected for user: ${userId}`);

    ws.on("close", () => {
      this.removeClient(userId, ws);
    });
  }

  // Remove a user's WebSocket connection
  removeClient(userId: string, ws: WebSocket) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
    console.log(`❌ WebSocket disconnected for user: ${userId}`);
  }

  // Notify a specific user
  notifyUser(userId: string, message: any, type: string = "NEW_MESSAGE") {
    const notification = JSON.stringify({
      type,
      data: message,
    });

    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(notification);
          console.log(`📤 Notified user ${userId} of ${type}`);
        }
      });
    }
  }

  // Notify specific users about a new message
  notifyUsers(userIds: string[], message: any, type: string = "NEW_MESSAGE") {
    const notification = JSON.stringify({
      type,
      data: message,
    });

    userIds.forEach((userId) => {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.forEach((ws) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(notification);
            console.log(`📤 Notified user ${userId} of ${type}`);
          }
        });
      }
    });
  }

  // Get all connected user IDs
  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }
}

export const messageNotifier = new MessageNotifier();


