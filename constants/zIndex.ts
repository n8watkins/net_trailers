/**
 * Z-Index Hierarchy Constants
 *
 * This file centralizes all z-index values used throughout the application.
 * Values are organized in layers from lowest to highest.
 *
 * IMPORTANT: When adding new z-index values, add them here first and document
 * the use case. This prevents z-index conflicts and makes debugging easier.
 *
 * @see docs/Z_INDEX_HIERARCHY.md for detailed documentation
 */

export const Z_INDEX = {
    // ========================================
    // LAYER 1: Base Content (10-40)
    // Elements within cards and content areas
    // ========================================

    /** Shimmer effects, input decorations */
    CONTENT_DECORATION: 10,

    /** Badges, overlays on content cards */
    CONTENT_BADGE: 20,

    /** Text overlays, buttons on content */
    CONTENT_OVERLAY: 30,

    /** Hover state elevation for cards */
    CONTENT_HOVER: 40,

    // ========================================
    // LAYER 2: Page-Level UI (50-60)
    // Basic modals and floating UI elements
    // ========================================

    /** Basic modals (CreatePollModal, ReportModal) */
    MODAL_BASE: 50,

    /** Scroll to top button, floating action buttons */
    FLOATING_ACTION: 60,

    // ========================================
    // LAYER 3: Dropdowns & Overlays (105-110)
    // Navigation dropdowns and mobile overlays
    // ========================================

    /** Mobile menu backdrop */
    MOBILE_BACKDROP: 105,

    /** Dropdown menus (Search, Genres, Avatar, Suggestions) */
    DROPDOWN: 110,

    // ========================================
    // LAYER 4: Fixed Navigation (200)
    // Header and persistent navigation
    // ========================================

    /** Main header/navigation bar */
    HEADER: 200,

    // ========================================
    // LAYER 5: Above Navigation (250)
    // Elements that must appear above the header
    // ========================================

    /** Dropdowns that open from header (ProfileDropdown, MyListsDropdown) */
    DROPDOWN_ABOVE_HEADER: 250,

    /** Ranking creator overlay */
    RANKING_CREATOR: 250,

    // ========================================
    // LAYER 6: Inline Pickers (1500)
    // Small picker modals attached to inputs
    // ========================================

    /** Icon picker, color picker (positioned relative to trigger) */
    PICKER: 1500,

    // ========================================
    // LAYER 7: Auth Modal (9999)
    // Authentication requires high priority
    // ========================================

    /** Authentication modal */
    AUTH_MODAL: 9999,

    // ========================================
    // LAYER 8: Debug Tools (9998-9999)
    // Development/debug overlays (same level as auth)
    // ========================================

    /** Firebase call tracker badge */
    DEBUG_BADGE: 9998,

    /** Debug controls, Web Vitals HUD, Netflix loader */
    DEBUG_PANEL: 9999,

    // ========================================
    // LAYER 9: Settings Modal (10000)
    // User settings needs to be above debug
    // ========================================

    /** User settings modal */
    SETTINGS_MODAL: 10000,

    // ========================================
    // LAYER 10: Standard Modals (50000)
    // Most application modals
    // ========================================

    /** Info, About, Confirmation, Tutorial, Keyboard shortcuts, Preference modals */
    MODAL_STANDARD: 50000,

    // ========================================
    // LAYER 11: List Selection (55000)
    // List selection and collection creation
    // ========================================

    /** List selection modal, Collection creator modal, Debug tracker panel */
    MODAL_LIST_SELECTION: 55000,

    // ========================================
    // LAYER 12: Collection Builder (56000)
    // Collection building workflows
    // ========================================

    /** Collection builder modal */
    MODAL_COLLECTION_BUILDER: 56000,

    // ========================================
    // LAYER 13: Delete Confirmation (60000)
    // Destructive action confirmations
    // ========================================

    /** Delete confirmation modals (CollectionCard) */
    MODAL_DELETE: 60000,

    // ========================================
    // LAYER 14: Editor Modal (99998-100000)
    // Full-screen editor overlays with internal layers
    // ========================================

    /** Collection editor backdrop */
    MODAL_EDITOR_BACKDROP: 99998,

    /** Collection editor modal content */
    MODAL_EDITOR: 99999,

    /** Collection editor internal modals (genre picker) */
    MODAL_EDITOR_INTERNAL: 100000,

    // ========================================
    // LAYER 15: Top Layer (100001)
    // Absolutely highest priority elements
    // ========================================

    /** Toast notifications - must always be visible */
    TOAST: 100001,

    /** Delete confirmation within editor modal */
    MODAL_EDITOR_DELETE: 100001,
} as const

// Type for z-index values
export type ZIndexKey = keyof typeof Z_INDEX
export type ZIndexValue = (typeof Z_INDEX)[ZIndexKey]

/**
 * Helper to get Tailwind z-index class
 * @example getZIndexClass('MODAL_STANDARD') // 'z-[50000]'
 */
export function getZIndexClass(key: ZIndexKey): string {
    return `z-[${Z_INDEX[key]}]`
}

/**
 * Helper to get inline style z-index
 * @example getZIndexStyle('HEADER') // { zIndex: 200 }
 */
export function getZIndexStyle(key: ZIndexKey): { zIndex: number } {
    return { zIndex: Z_INDEX[key] }
}
