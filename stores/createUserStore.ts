import { create } from 'zustand'
import { Content, getTitle } from '../typings'
import { UserList, UpdateListRequest, CreateListRequest } from '../types/userLists'
import { UserListsService } from '../services/userListsService'
import { StorageAdapter, StorageLogger } from '../services/storageAdapter'
import { firebaseTracker } from '../utils/firebaseCallTracker'
import { syncManager } from '../utils/firebaseSyncManager'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notifications'
import type { NotificationPreferences } from '../types/notifications'

/**
 * User store state (works for both auth and guest users)
 */
export interface UserState {
    userId?: string // For auth users, this is Firebase UID
    guestId?: string // For guest users, this is the guest ID
    likedMovies: Content[]
    hiddenMovies: Content[]
    defaultWatchlist: Content[]
    userCreatedWatchlists: UserList[]
    lastActive: number
    syncStatus?: 'synced' | 'syncing' | 'offline' // Only used for async adapters (Firebase)
    autoMute?: boolean
    defaultVolume?: number
    childSafetyMode?: boolean
    improveRecommendations?: boolean
    showRecommendations?: boolean
    notifications?: NotificationPreferences
}

/**
 * User store actions (works for both auth and guest users)
 */
export interface UserActions {
    addToWatchlist: (content: Content) => Promise<void> | void
    removeFromWatchlist: (contentId: number) => Promise<void> | void
    addLikedMovie: (content: Content) => Promise<void> | void
    removeLikedMovie: (contentId: number) => Promise<void> | void
    addHiddenMovie: (content: Content) => Promise<void> | void
    removeHiddenMovie: (contentId: number) => Promise<void> | void
    createList: (request: CreateListRequest) => Promise<string> | string
    addToList: (listId: string, content: Content) => Promise<void> | void
    removeFromList: (listId: string, contentId: number) => Promise<void> | void
    updateList: (listId: string, updates: Omit<UpdateListRequest, 'id'>) => Promise<void> | void
    deleteList: (listId: string) => Promise<void> | void
    updatePreferences: (prefs: Partial<UserState>) => Promise<void> | void
    syncWithStorage?: (userId: string) => Promise<void> // Only for Firebase adapter
    syncWithFirebase?: (userId: string) => Promise<void> // Alias for syncWithStorage (auth store)
    clearLocalCache: () => void
    loadData: (data: UserState) => void
    syncFromLocalStorage?: (guestId: string) => Promise<void> // Only for localStorage adapter
    clearAllData?: () => void // Only for guest store
}

export type UserStore = UserState & UserActions

interface CreateUserStoreOptions {
    adapter: StorageAdapter
    logger: StorageLogger
    idField: 'userId' | 'guestId'
    trackingContext: string // 'AuthStore' or 'GuestStore'
    enableFirebaseSync?: boolean // If true, adds syncWithStorage method
    enableGuestFeatures?: boolean // If true, adds guest-specific features
}

/**
 * Factory function to create a unified user store
 *
 * This eliminates ~400 lines of duplication between authStore and guestStore
 * by abstracting the storage backend behind the StorageAdapter interface.
 *
 * @param options - Configuration for store creation
 * @returns Zustand store with user state and actions
 */
export function createUserStore(options: CreateUserStoreOptions) {
    const { adapter, logger, idField, trackingContext, enableFirebaseSync, enableGuestFeatures } =
        options

    const cloneDefaultNotifications = (): NotificationPreferences => ({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        types: { ...DEFAULT_NOTIFICATION_PREFERENCES.types },
    })

    const getDefaultState = (): UserState => ({
        [idField]: undefined,
        likedMovies: [],
        hiddenMovies: [],
        defaultWatchlist: [],
        userCreatedWatchlists: [],
        lastActive: 0,
        autoMute: true,
        defaultVolume: 50,
        childSafetyMode: false,
        improveRecommendations: true,
        showRecommendations: false, // Disabled by default
        notifications: cloneDefaultNotifications(),
        ...(adapter.isAsync && { syncStatus: 'synced' as const }),
    })

    // Helper to save data to storage
    const saveToStorage = async (state: UserState, context: string) => {
        const id = state[idField]
        if (!id) {
            if (adapter.isAsync) {
                return
            }
            logger.warn(`⚠️ [${trackingContext}] No ${idField}, cannot save to storage`)
            return
        }

        // Track Firebase calls for authenticated users
        if (adapter.name === 'Firebase') {
            firebaseTracker.track(`saveUserData-${context}`, trackingContext, id, {
                watchlistCount: state.defaultWatchlist.length,
                likedCount: state.likedMovies.length,
                hiddenCount: state.hiddenMovies.length,
                listsCount: state.userCreatedWatchlists.length,
            })
        }

        try {
            await adapter.save(id, {
                likedMovies: state.likedMovies,
                hiddenMovies: state.hiddenMovies,
                defaultWatchlist: state.defaultWatchlist,
                userCreatedWatchlists: state.userCreatedWatchlists,
                lastActive: Date.now(),
                autoMute: state.autoMute ?? true,
                defaultVolume: state.defaultVolume ?? 50,
                childSafetyMode: state.childSafetyMode ?? false,
                improveRecommendations: state.improveRecommendations ?? true,
                showRecommendations: state.showRecommendations ?? false,
                notifications: state.notifications ?? cloneDefaultNotifications(),
            })
            logger.log(`✅ [${trackingContext}] Saved to ${adapter.name}`)
        } catch (error) {
            logger.error(`❌ [${trackingContext}] Failed to save to ${adapter.name}:`, error)
            throw error
        }
    }

    return create<UserStore>((set, get) => ({
        ...getDefaultState(),

        addToWatchlist: async (content: Content) => {
            const state = get()
            const isAlreadyInWatchlist = state.defaultWatchlist.some(
                (item) => item.id === content.id
            )
            if (isAlreadyInWatchlist) {
                logger.log(`⚠️ [${trackingContext}] Item already in watchlist:`, getTitle(content))
                return
            }

            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const newWatchlist = [...state.defaultWatchlist, content]
            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                defaultWatchlist: newWatchlist,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'addToWatchlist')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`✅ [${trackingContext}] Added to watchlist:`, {
                title: getTitle(content),
                contentId: content.id,
                newWatchlistCount: newWatchlist.length,
            })
        },

        removeFromWatchlist: async (contentId: number) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const newWatchlist = state.defaultWatchlist.filter((item) => item.id !== contentId)
            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                defaultWatchlist: newWatchlist,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'removeFromWatchlist')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🗑️ [${trackingContext}] Removed from watchlist:`, contentId)
        },

        addLikedMovie: async (content: Content) => {
            const state = get()
            const isAlreadyLiked = state.likedMovies.some((m) => m.id === content.id)
            if (isAlreadyLiked) {
                logger.log(`⚠️ [${trackingContext}] Movie already liked:`, getTitle(content))
                return
            }

            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            // Mutual exclusion: Remove from hidden if exists
            const wasHidden = state.hiddenMovies.some((m) => m.id === content.id)
            const newHiddenMovies = wasHidden
                ? state.hiddenMovies.filter((m) => m.id !== content.id)
                : state.hiddenMovies
            const newLikedMovies = [...state.likedMovies, content]

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            const stateUpdates: Partial<UserStore> = {
                likedMovies: newLikedMovies,
                lastActive: newLastActive,
            }
            if (wasHidden) {
                stateUpdates.hiddenMovies = newHiddenMovies
            }
            set(stateUpdates)

            try {
                await saveToStorage(get(), 'addLiked')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`👍 [${trackingContext}] Added to liked:`, getTitle(content))
        },

        removeLikedMovie: async (contentId: number) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const newLikedMovies = state.likedMovies.filter((m) => m.id !== contentId)
            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                likedMovies: newLikedMovies,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'removeLiked')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🗑️ [${trackingContext}] Removed from liked:`, contentId)
        },

        addHiddenMovie: async (content: Content) => {
            const state = get()
            const isAlreadyHidden = state.hiddenMovies.some((m) => m.id === content.id)
            if (isAlreadyHidden) {
                logger.log(`⚠️ [${trackingContext}] Movie already hidden:`, getTitle(content))
                return
            }

            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            // Mutual exclusion: Remove from liked if exists
            const wasLiked = state.likedMovies.some((m) => m.id === content.id)
            const newLikedMovies = wasLiked
                ? state.likedMovies.filter((m) => m.id !== content.id)
                : state.likedMovies
            const newHiddenMovies = [...state.hiddenMovies, content]

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            const stateUpdates: Partial<UserStore> = {
                hiddenMovies: newHiddenMovies,
                lastActive: newLastActive,
            }
            if (wasLiked) {
                stateUpdates.likedMovies = newLikedMovies
            }
            set(stateUpdates)

            try {
                await saveToStorage(get(), 'addHidden')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🙈 [${trackingContext}] Added to hidden:`, getTitle(content))
        },

        removeHiddenMovie: async (contentId: number) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const newHiddenMovies = state.hiddenMovies.filter((m) => m.id !== contentId)
            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                hiddenMovies: newHiddenMovies,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'removeHidden')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🗑️ [${trackingContext}] Removed from hidden:`, contentId)
        },

        createList: async (request: CreateListRequest) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const updatedPrefs = UserListsService.createList(state, request)
            const newList =
                updatedPrefs.userCreatedWatchlists[updatedPrefs.userCreatedWatchlists.length - 1]

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'createList')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`📋 [${trackingContext}] Created list:`, request.name, newList.id)
            return newList.id
        },

        addToList: async (listId: string, content: Content) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const updatedPrefs = UserListsService.addToList(state, { listId, content })

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'addToList')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`📝 [${trackingContext}] Added to list:`, {
                listId,
                content: getTitle(content),
            })
        },

        removeFromList: async (listId: string, contentId: number) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const updatedPrefs = UserListsService.removeFromList(state, { listId, contentId })

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'removeFromList')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🗑️ [${trackingContext}] Removed from list:`, { listId, contentId })
        },

        updateList: async (
            listId: string,
            updates: { name?: string; emoji?: string; color?: string }
        ) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const updatedPrefs = UserListsService.updateList(state, { id: listId, ...updates })

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'updateList')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`✏️ [${trackingContext}] Updated list:`, { listId, updates })
        },

        deleteList: async (listId: string) => {
            const state = get()
            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            const updatedPrefs = UserListsService.deleteList(state, listId)

            const newLastActive = typeof window !== 'undefined' ? Date.now() : 0
            set({
                userCreatedWatchlists: updatedPrefs.userCreatedWatchlists,
                lastActive: newLastActive,
            })

            try {
                await saveToStorage(get(), 'deleteList')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
            }

            logger.log(`🗑️ [${trackingContext}] Deleted list:`, listId)
        },

        updatePreferences: async (prefs: Partial<UserState>) => {
            // Guest-specific: Block child safety mode changes
            if (enableGuestFeatures && 'childSafetyMode' in prefs) {
                logger.log(
                    `⚠️ [${trackingContext}] Blocked childSafetyMode update - guests cannot change this setting`
                )
                const { childSafetyMode: _childSafetyMode, ...allowedPrefs } = prefs
                if (Object.keys(allowedPrefs).length === 0) return
                prefs = allowedPrefs
            }

            // ✅ CRITICAL: Clear cache when child safety mode changes
            // This prevents serving cached adult content when switching to child safety mode
            // or vice versa
            if ('childSafetyMode' in prefs && typeof window !== 'undefined') {
                const currentChildSafetyMode = get().childSafetyMode
                const newChildSafetyMode = prefs.childSafetyMode

                if (currentChildSafetyMode !== newChildSafetyMode) {
                    // Import cache store dynamically to avoid circular dependency
                    import('./cacheStore').then(({ useCacheStore }) => {
                        useCacheStore.getState().clearCache()
                        logger.log(
                            `🧹 [${trackingContext}] Cache cleared due to childSafetyMode change: ${currentChildSafetyMode} → ${newChildSafetyMode}`
                        )
                    })
                }
            }

            if (adapter.isAsync) set({ syncStatus: 'syncing' })

            set({
                ...prefs,
                lastActive: typeof window !== 'undefined' ? Date.now() : 0,
            })

            const state = get()

            try {
                await saveToStorage(state, 'updatePreferences')
                if (adapter.isAsync) set({ syncStatus: 'synced' })
                logger.log(`✅ [${trackingContext}] Preferences saved:`, {
                    autoMute: state.autoMute,
                    defaultVolume: state.defaultVolume,
                    childSafetyMode: state.childSafetyMode,
                    improveRecommendations: state.improveRecommendations,
                    showRecommendations: state.showRecommendations,
                })
            } catch (_error) {
                if (adapter.isAsync) set({ syncStatus: 'offline' })
                logger.error(`❌ [${trackingContext}] Failed to save preferences:`, _error)
            }
        },

        ...(enableFirebaseSync && {
            syncWithStorage: async (userId: string) => {
                const state = get()

                // Clear store if switching to a different user
                if (state.userId && state.userId !== userId) {
                    logger.warn(
                        `⚠️ [${trackingContext}] User ID mismatch! Store: ${state.userId}, Requested: ${userId}. Clearing store.`
                    )
                    set(getDefaultState())
                    syncManager.clearUserSync(state.userId)
                }

                // Use sync manager to prevent duplicate syncs
                await syncManager.executeSync(
                    userId,
                    async () => {
                        try {
                            logger.log(`🔄 [${trackingContext}] Executing sync for user: ${userId}`)
                            firebaseTracker.track('syncWithFirebase', trackingContext, userId)
                            set({ syncStatus: 'syncing', userId })

                            const firebaseData = await adapter.load(userId)

                            // Verify we're still loading data for the correct user
                            const currentState = get()
                            if (currentState.userId !== userId) {
                                logger.warn(
                                    `⚠️ [${trackingContext}] User changed during sync (${currentState.userId} != ${userId}), aborting`
                                )
                                return null
                            }

                            // Ensure all collections have required new fields for backward compatibility
                            const normalizedCollections = (
                                firebaseData.userCreatedWatchlists || []
                            ).map((list, index) => ({
                                ...list,
                                collectionType: list.collectionType || ('manual' as const),
                                displayAsRow: list.displayAsRow ?? true,
                                order: list.order ?? index,
                                enabled: list.enabled ?? true,
                            }))

                            set({
                                userId,
                                likedMovies: firebaseData.likedMovies,
                                hiddenMovies: firebaseData.hiddenMovies,
                                defaultWatchlist: firebaseData.defaultWatchlist,
                                userCreatedWatchlists: normalizedCollections,
                                lastActive: firebaseData.lastActive,
                                autoMute: firebaseData.autoMute ?? true,
                                defaultVolume: firebaseData.defaultVolume ?? 50,
                                childSafetyMode: firebaseData.childSafetyMode ?? false,
                                improveRecommendations: firebaseData.improveRecommendations ?? true,
                                showRecommendations: firebaseData.showRecommendations ?? false,
                                notifications:
                                    firebaseData.notifications ?? cloneDefaultNotifications(),
                                syncStatus: 'synced',
                            })

                            logger.log(
                                `✅ [${trackingContext}] Successfully synced for user ${userId}`
                            )
                            return firebaseData
                        } catch (error) {
                            logger.error(`❌ [${trackingContext}] Failed to sync:`, error)
                            set({ syncStatus: 'offline' })
                            throw error
                        }
                    },
                    trackingContext
                )
            },
            // Alias for backward compatibility with authStore
            get syncWithFirebase() {
                return this.syncWithStorage
            },
        }),

        ...(enableGuestFeatures && {
            syncFromLocalStorage: async (guestId: string) => {
                const loadedData = await adapter.load(guestId)

                // Ensure all collections have required new fields for backward compatibility
                const normalizedCollections = (loadedData.userCreatedWatchlists || []).map(
                    (list, index) => ({
                        ...list,
                        collectionType: list.collectionType || ('manual' as const),
                        displayAsRow: list.displayAsRow ?? true,
                        order: list.order ?? index,
                        enabled: list.enabled ?? true,
                    })
                )

                set({
                    [idField]: guestId,
                    likedMovies: loadedData.likedMovies,
                    hiddenMovies: loadedData.hiddenMovies,
                    defaultWatchlist: loadedData.defaultWatchlist,
                    userCreatedWatchlists: normalizedCollections,
                    lastActive: loadedData.lastActive,
                    autoMute: loadedData.autoMute ?? true,
                    defaultVolume: loadedData.defaultVolume ?? 50,
                    childSafetyMode: false, // Always false for guests
                    improveRecommendations: loadedData.improveRecommendations ?? true,
                    showRecommendations: loadedData.showRecommendations ?? false,
                    notifications: loadedData.notifications ?? cloneDefaultNotifications(),
                })
                logger.log(`🔄 [${trackingContext}] Synced from localStorage:`, {
                    guestId,
                    watchlistCount: loadedData.defaultWatchlist.length,
                })
            },
            clearAllData: () => {
                const state = get()
                const preservedId = state[idField]

                if (preservedId) {
                    adapter.clear(preservedId as string)
                }

                set({
                    ...getDefaultState(),
                    [idField]: preservedId,
                    lastActive: typeof window !== 'undefined' ? Date.now() : 0,
                })
                logger.log(`🧹 [${trackingContext}] Cleared all data, preserved ${idField}`)
            },
        }),

        clearLocalCache: () => {
            const state = get()
            const id = state[idField]
            set(getDefaultState())
            logger.log(`🧹 [${trackingContext}] Cleared local cache for ${idField} ${id}`)
        },

        loadData: (data: UserState) => {
            const state = get()

            // Verify we're loading data for the correct user if ID is provided
            if (data[idField] && state[idField] && data[idField] !== state[idField]) {
                logger.warn(
                    `⚠️ [${trackingContext}] Attempted to load data for wrong ${idField}! Store: ${state[idField]}, Data: ${data[idField]}`
                )
                return
            }

            set({
                ...data,
                notifications: data.notifications ?? cloneDefaultNotifications(),
                lastActive: typeof window !== 'undefined' ? Date.now() : 0,
            })
            logger.log(
                `📥 [${trackingContext}] Loaded data for ${idField} ${data[idField] || 'unknown'}:`,
                {
                    watchlistCount: data.defaultWatchlist.length,
                    likedCount: data.likedMovies.length,
                    hiddenCount: data.hiddenMovies.length,
                    listsCount: data.userCreatedWatchlists.length,
                }
            )
        },
    }))
}
