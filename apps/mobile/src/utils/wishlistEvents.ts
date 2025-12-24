// Simple event emitter for wishlist-related events

type EventCallback = () => void;

class WishlistEventEmitter {
  private listeners: EventCallback[] = [];

  subscribe(callback: EventCallback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  emit() {
    this.listeners.forEach(listener => listener());
  }
}

export const wishlistEvents = new WishlistEventEmitter();













