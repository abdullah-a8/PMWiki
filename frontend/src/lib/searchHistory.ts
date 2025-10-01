// Search History LocalStorage Utility

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  primarySourcesCount: number;
  standards: string[];
}

const STORAGE_KEY = 'pmwiki_search_history';
const MAX_HISTORY_ITEMS = 10;

export const searchHistoryStorage = {
  // Get all search history
  getHistory(): SearchHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error reading search history:', error);
      return [];
    }
  },

  // Add a new search to history (only for new searches, not when viewing history)
  addSearch(query: string, primarySourcesCount: number, standards: string[], updateTimestamp: boolean = true): SearchHistoryItem {
    const history = this.getHistory();

    // Check if this exact query already exists
    const existingIndex = history.findIndex(item => item.query.toLowerCase() === query.toLowerCase());

    if (existingIndex !== -1 && !updateTimestamp) {
      // Just viewing history - don't modify anything, return existing item
      return history[existingIndex];
    }

    let updatedHistory: SearchHistoryItem[];

    if (existingIndex !== -1) {
      // Query exists and updateTimestamp is true - move to front with new timestamp
      const newItem: SearchHistoryItem = {
        id: `search-${Date.now()}`,
        query,
        timestamp: Date.now(),
        primarySourcesCount,
        standards,
      };
      updatedHistory = [
        newItem,
        ...history.filter((_, idx) => idx !== existingIndex)
      ];
    } else {
      // New query - add to front
      const newItem: SearchHistoryItem = {
        id: `search-${Date.now()}`,
        query,
        timestamp: Date.now(),
        primarySourcesCount,
        standards,
      };
      updatedHistory = [newItem, ...history];
    }

    // Keep only MAX_HISTORY_ITEMS
    updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }

    return updatedHistory[0];
  },

  // Remove a specific search from history
  removeSearch(id: string): void {
    const history = this.getHistory();
    const updatedHistory = history.filter(item => item.id !== id);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error removing search from history:', error);
    }
  },

  // Clear all search history
  clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  },

  // Get a specific search by ID
  getSearchById(id: string): SearchHistoryItem | null {
    const history = this.getHistory();
    return history.find(item => item.id === id) || null;
  }
};
