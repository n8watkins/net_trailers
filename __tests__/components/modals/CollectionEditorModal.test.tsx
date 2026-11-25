import { act, fireEvent, render, screen } from '@testing-library/react'
import CollectionEditorModal from '../../../components/modals/CollectionEditorModal'
import { ALL_SYSTEM_COLLECTIONS } from '../../../constants/systemCollections'
import type { UserList } from '../../../types/collections'

const updateList = jest.fn()
const addToList = jest.fn()
const removeFromList = jest.fn()
const deleteList = jest.fn()
const showSuccess = jest.fn()
const showError = jest.fn()

jest.mock('../../../hooks/useUserData', () => ({
    __esModule: true,
    default: () => ({ updateList, addToList, removeFromList, deleteList }),
}))
jest.mock('../../../hooks/useToast', () => ({
    useToast: () => ({ showSuccess, showError }),
}))
jest.mock('../../../hooks/useChildSafety', () => ({
    useChildSafety: () => ({ isEnabled: false }),
}))
// The title search talks to TMDB; a button stands in for picking a result
jest.mock('../../../components/modals/InlineSearchBar', () => ({
    __esModule: true,
    default: ({ onAddContent }: { onAddContent: (c: unknown) => void }) => (
        <button
            type="button"
            onClick={() =>
                onAddContent({
                    id: 99,
                    title: 'Added Title',
                    media_type: 'movie',
                    poster_path: null,
                    release_date: '2020-01-01',
                    vote_average: 7,
                })
            }
        >
            Add a title
        </button>
    ),
}))

const builtIn = ALL_SYSTEM_COLLECTIONS[0] as UserList
const mine: UserList = {
    ...builtIn,
    id: 'list-1',
    name: 'My Picks',
    collectionType: 'manual',
    isSystemCollection: false,
    genres: [],
    canGenerateMore: false,
}

function renderEditor(collection: UserList = builtIn) {
    const onClose = jest.fn()
    render(<CollectionEditorModal collection={collection} isOpen onClose={onClose} />)
    return { onClose, dialog: screen.getByRole('dialog', { name: collection.name }) }
}

function rename(value: string) {
    fireEvent.change(screen.getByLabelText('Collection name'), { target: { value } })
}

beforeEach(() => {
    jest.clearAllMocks()
    updateList.mockResolvedValue(undefined)
})

describe('CollectionEditorModal', () => {
    it('is a labelled dialog with a close button that takes focus', () => {
        const { dialog } = renderEditor()
        expect(dialog.getAttribute('aria-modal')).toBe('true')
        expect(document.activeElement).toBe(dialog)
        expect(screen.getByRole('button', { name: 'Close editor' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
    })

    it('closes straight away when nothing changed', () => {
        const { onClose } = renderEditor()
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(updateList).not.toHaveBeenCalled()
    })

    it.each([
        ['Escape', () => fireEvent.keyDown(document, { key: 'Escape' })],
        [
            'a click outside',
            () => fireEvent.click(screen.getByTestId('collection-editor-backdrop')),
        ],
        [
            'the close button',
            () => fireEvent.click(screen.getByRole('button', { name: 'Close editor' })),
        ],
        ['Cancel', () => fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ])('asks before discarding changes on %s, and never saves', (_how, leave) => {
        const { onClose } = renderEditor()
        rename('Changed')
        leave()
        expect(screen.getByRole('alert').textContent).toMatch('Discard unsaved changes?')
        expect(onClose).not.toHaveBeenCalled()

        // Escape on the question means keep editing
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.queryByRole('alert')).toBeNull()
        expect((screen.getByLabelText('Collection name') as HTMLInputElement).value).toBe('Changed')

        leave()
        fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
        expect(onClose).toHaveBeenCalledTimes(1)
        expect(updateList).not.toHaveBeenCalled()
    })

    it('saves everything in one go on Save', async () => {
        const { onClose } = renderEditor()
        rename('Big Action')
        fireEvent.click(screen.getByRole('switch', { name: 'Show on home' }))
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        })
        expect(updateList).toHaveBeenCalledTimes(1)
        expect(updateList).toHaveBeenCalledWith(
            builtIn.id,
            expect.objectContaining({ name: 'Big Action', enabled: false, displayAsRow: false })
        )
        expect(onClose).toHaveBeenCalled()
    })

    it('adds and removes titles only when saved', async () => {
        renderEditor(mine)
        fireEvent.click(screen.getByRole('button', { name: 'Add a title' }))
        expect(addToList).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Remove Added Title' })).toBeTruthy()

        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.getByRole('alert')).toBeTruthy()
        fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }))

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Save' }))
        })
        expect(addToList).toHaveBeenCalledWith('list-1', expect.objectContaining({ id: 99 }))
    })

    it('offers Hide, not Delete, on a built-in genre row', async () => {
        renderEditor()
        expect(screen.queryByRole('button', { name: /Delete/ })).toBeNull()
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Hide from home' }))
        })
        expect(updateList).toHaveBeenCalledWith(
            builtIn.id,
            expect.objectContaining({ enabled: false, displayAsRow: false })
        )
    })

    it('still offers Delete on a collection the owner made', () => {
        renderEditor(mine)
        expect(screen.getByRole('button', { name: /Delete/ })).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'Hide from home' })).toBeNull()
    })
})
