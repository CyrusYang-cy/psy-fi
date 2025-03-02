type EventCallback = (data: any) => void;

interface EventMap {
  [eventName: string]: EventCallback[];
}

// Simple event emitter for cross-component communication
const events: EventMap = {};

/**
 * Subscribe to an event
 * @param eventName Name of the event to listen for
 * @param callback Function to call when the event is triggered
 * @returns Unsubscribe function
 */
export const listenEvent = (eventName: string, callback: EventCallback): () => void => {
  if (!events[eventName]) {
    events[eventName] = [];
  }
  
  events[eventName].push(callback);
  
  // Return unsubscribe function
  return () => {
    events[eventName] = events[eventName].filter(cb => cb !== callback);
  };
};

/**
 * Create and emit an event
 * @param eventName Name of the event to trigger
 * @param data Data to pass to event listeners
 */
export const createEvent = (eventName: string, data: any): void => {
  if (!events[eventName]) {
    return;
  }
  
  events[eventName].forEach(callback => {
    callback(data);
  });
}; 