// Request notification permission on app start
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  }
  
  return false;
};

// Show desktop notification for new messages
export const showMessageNotification = (senderName: string, message: string, chatId: string) => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }
  
  try {
    const notification = new Notification(`New message from ${senderName}`, {
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      icon: '/favicon.ico',
      tag: `message-${chatId}`,
      requireInteraction: false,
      badge: '/favicon.ico',
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    // Click to focus app
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

// Show desktop notification for incoming calls
export const showCallNotification = (callerName: string, callType: 'audio' | 'video') => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    // Try to request permission
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notification permission granted, please try again');
      }
    });
    return null;
  }
  
  try {
    const notification = new Notification(`📞 Incoming ${callType} call`, {
      body: `${callerName} is calling you. Click to answer.`,
      icon: '/favicon.ico',
      tag: 'incoming-call',
      requireInteraction: true, // Keep visible until user interacts
      silent: false, // Play sound
      badge: '/favicon.ico',
    });

    // Click to focus app and answer
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Failed to show call notification:', error);
    return null;
  }
};