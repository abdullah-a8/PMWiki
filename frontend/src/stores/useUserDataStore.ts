import { create } from 'zustand'
import type { StateCreator } from 'zustand'
import { persist, createJSONStorage, devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { BookmarkItem, SearchHistoryItem } from '@/types'

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_SEARCH_HISTORY = 10
export const MAX_BOOKMARKS = 100
const STORAGE_KEY = 'pmwiki-user-data'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SearchHistorySlice {
  searchHistory: SearchHistoryItem[]

  // Actions
  addSearch: (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => void
  removeSearch: (id: string) => void
  clearSearchHistory: () => void

  // Queries
  getSearchByQuery: (query: string) => SearchHistoryItem | undefined
}

interface BookmarksSlice {
  bookmarks: Record<string, BookmarkItem>
  bookmarkOrder: string[]

  // Actions
  addBookmark: (item: Omit<BookmarkItem, 'bookmarked_at'>) => void
  removeBookmark: (id: string) => void
  toggleBookmark: (item: Omit<BookmarkItem, 'bookmarked_at'>) => boolean
  clearBookmarks: () => void

  // Queries
  isBookmarked: (id: string) => boolean
  getBookmarksByStandard: (standard: string) => BookmarkItem[]
  getAllBookmarks: () => BookmarkItem[]
  getBookmarkCount: () => number
}

type UserDataStore = SearchHistorySlice & BookmarksSlice

// ============================================================================
// SEARCH HISTORY SLICE
// ============================================================================

const createSearchHistorySlice: StateCreator<
  UserDataStore,
  [],
  [],
  SearchHistorySlice
> = (set, get) => ({
  searchHistory: [],

  addSearch: (item) =>
    set((state) => {
      // Check for existing query (case-insensitive)
      const existingIndex = state.searchHistory.findIndex(
        (h) => h.query.toLowerCase() === item.query.toLowerCase()
      )

      const newItem: SearchHistoryItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      }

      let updatedHistory: SearchHistoryItem[]

      if (existingIndex !== -1) {
        // Move existing to front with new timestamp
        updatedHistory = [
          newItem,
          ...state.searchHistory.filter((_, idx) => idx !== existingIndex),
        ]
      } else {
        // Add new to front
        updatedHistory = [newItem, ...state.searchHistory]
      }

      // Keep only MAX_SEARCH_HISTORY items
      return {
        searchHistory: updatedHistory.slice(0, MAX_SEARCH_HISTORY)
      }
    }),

  removeSearch: (id) =>
    set((state) => ({
      searchHistory: state.searchHistory.filter((item) => item.id !== id),
    })),

  clearSearchHistory: () => set({ searchHistory: [] }),

  getSearchByQuery: (query) => {
    const state = get()
    return state.searchHistory.find(
      (h) => h.query.toLowerCase() === query.toLowerCase()
    )
  },
})

// ============================================================================
// BOOKMARKS SLICE
// ============================================================================

const createBookmarksSlice: StateCreator<
  UserDataStore,
  [],
  [],
  BookmarksSlice
> = (set, get) => ({
  bookmarks: {},
  bookmarkOrder: [],

  addBookmark: (item) =>
    set((state) => {
      // Check if already bookmarked
      if (state.bookmarks[item.id]) {
        return state
      }

      // Check bookmark limit
      if (state.bookmarkOrder.length >= MAX_BOOKMARKS) {
        return state
      }

      const newBookmark: BookmarkItem = {
        ...item,
        bookmarked_at: Date.now(),
      }

      return {
        bookmarks: {
          ...state.bookmarks,
          [item.id]: newBookmark,
        },
        bookmarkOrder: [item.id, ...state.bookmarkOrder],
      }
    }),

  removeBookmark: (id) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...restBookmarks } = state.bookmarks
      return {
        bookmarks: restBookmarks,
        bookmarkOrder: state.bookmarkOrder.filter((bId) => bId !== id),
      }
    }),

  toggleBookmark: (item) => {
    const state = get()
    const isCurrentlyBookmarked = state.isBookmarked(item.id)

    if (isCurrentlyBookmarked) {
      state.removeBookmark(item.id)
      return false
    } else {
      state.addBookmark(item)
      return true
    }
  },

  clearBookmarks: () => set({ bookmarks: {}, bookmarkOrder: [] }),

  isBookmarked: (id) => {
    const state = get()
    return !!state.bookmarks[id]
  },

  getBookmarksByStandard: (standard) => {
    const state = get()
    return state.bookmarkOrder
      .map((id) => state.bookmarks[id])
      .filter((bookmark) => bookmark && bookmark.standard === standard)
  },

  getAllBookmarks: () => {
    const state = get()
    return state.bookmarkOrder
      .map((id) => state.bookmarks[id])
      .filter(Boolean) // Filter out any undefined (shouldn't happen)
  },

  getBookmarkCount: () => {
    const state = get()
    return state.bookmarkOrder.length
  },
})

// ============================================================================
// COMBINED STORE WITH MIDDLEWARE
// ============================================================================

export const useUserDataStore = create<UserDataStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createSearchHistorySlice(...a),
        ...createBookmarksSlice(...a),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),

        // Only persist data, not computed functions
        partialize: (state) => ({
          searchHistory: state.searchHistory,
          bookmarks: state.bookmarks,
          bookmarkOrder: state.bookmarkOrder,
        }),

        // Version for future migrations
        version: 1,
      }
    ),
    {
      name: 'PMWikiUserData',
      enabled: import.meta.env.DEV, // Only in development
    }
  )
)

// ============================================================================
// SELECTOR HOOKS (Performance Optimized)
// ============================================================================

/**
 * Get valid search history (only items with cached results)
 * Component re-renders only when search history changes
 */
export const useSearchHistory = () =>
  useUserDataStore(
    useShallow((state) => state.searchHistory.filter(
      (item) =>
        item.answer &&
        item.primarySources &&
        item.primarySources.length > 0
    ))
  )

/**
 * Get search history actions
 */
export const useSearchHistoryActions = () =>
  useUserDataStore(
    useShallow((state) => ({
      addSearch: state.addSearch,
      removeSearch: state.removeSearch,
      clearSearchHistory: state.clearSearchHistory,
      getSearchByQuery: state.getSearchByQuery,
    }))
  )

/**
 * Get all bookmarks
 * Component re-renders only when bookmarks change
 */
export const useBookmarks = () =>
  useUserDataStore(
    useShallow((state) =>
      state.bookmarkOrder
        .map((id) => state.bookmarks[id])
        .filter(Boolean)
    )
  )

/**
 * Get bookmark count
 * Component re-renders only when count changes
 */
export const useBookmarkCount = () =>
  useUserDataStore((state) => state.bookmarkOrder.length)

/**
 * Check if specific section is bookmarked
 * Component re-renders only when this specific bookmark changes
 */
export const useIsBookmarked = (id: string) =>
  useUserDataStore((state) => state.isBookmarked(id))

/**
 * Get bookmarks for specific standard
 */
export const useBookmarksByStandard = (standard: string) =>
  useUserDataStore(
    useShallow((state) =>
      state.bookmarkOrder
        .map((id) => state.bookmarks[id])
        .filter((bookmark) => bookmark && bookmark.standard === standard)
    )
  )

/**
 * Get bookmark actions
 */
export const useBookmarkActions = () =>
  useUserDataStore(
    useShallow((state) => ({
      addBookmark: state.addBookmark,
      removeBookmark: state.removeBookmark,
      toggleBookmark: state.toggleBookmark,
      clearBookmarks: state.clearBookmarks,
    }))
  )

/**
 * Get entire store (use sparingly, causes re-renders on any change)
 */
export const useUserData = () => useUserDataStore()
