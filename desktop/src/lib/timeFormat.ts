/**
 * Utility function to format time based on user preference
 */
export function formatTime(date: Date | string | number, includeSeconds: boolean = false): string {
  // Handle null/undefined
  if (!date) return '';
  
  // Convert to Date object
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else if (typeof date === 'number') {
    d = new Date(date);
  } else {
    return '';
  }
  
  // Check if date is valid
  if (isNaN(d.getTime())) {
    return '';
  }
  
  const timeFormat = localStorage.getItem("timeFormat") || "24h";
  
  if (timeFormat === "24h") {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: false,
    });
  } else {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12: true,
    });
  }
}

