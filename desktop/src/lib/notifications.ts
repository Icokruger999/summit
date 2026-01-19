// Request notification permission on app start
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

// Show desktop notification for new messages
export const showMessageNotification = (senderName: string, message: string, chatId: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`New message from ${senderName}`, {
      body: message,
      icon: '/favicon.ico',
      tag: `message-${chatId}`,
      requireInteraction: false,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click to focus app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};

// Show desktop notification for incoming calls
export const showCallNotification = (callerName: string, callType: 'audio' | 'video') => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(`Incoming ${callType} call`, {
      body: `${callerName} is calling you`,
      icon: '/favicon.ico',
      tag: 'incoming-call',
      requireInteraction: true, // Keep visible until user interacts
    });

    // Click to focus app and answer
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
};