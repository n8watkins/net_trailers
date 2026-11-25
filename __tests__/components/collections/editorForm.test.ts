import {
    buildUpdate,
    formFromCollection,
    isDirty,
    validate,
} from '../../../components/collections/editor/editorForm'
import { ALL_SYSTEM_COLLECTIONS } from '../../../constants/systemCollections'
import type { UserList } from '../../../types/collections'

const actionPacked = ALL_SYSTEM_COLLECTIONS[0] as UserList

describe('collection editor draft', () => {
    it('starts clean and notices a change', () => {
        const start = formFromCollection(actionPacked)
        expect(isDirty(start, { ...start })).toBe(false)
        expect(isDirty(start, { ...start, name: 'Other' })).toBe(true)
        // Whitespace alone is not a change
        expect(isDirty(start, { ...start, name: `${start.name}  ` })).toBe(false)
        expect(isDirty(start, { ...start, removed: [1] })).toBe(true)
    })

    it('does not give a built-in row a TV emoji it never had', () => {
        const start = formFromCollection(actionPacked)
        expect(start.emoji).toBe('')
        expect(buildUpdate(start, { limited: false }).emoji).toBeUndefined()
    })

    it('saves home visibility as both flags and keeps the public-profile switch', () => {
        const draft = { ...formFromCollection(actionPacked), shownOnHome: false }
        const update = buildUpdate({ ...draft, showOnPublicProfile: false }, { limited: false })
        expect(update).toMatchObject({
            enabled: false,
            displayAsRow: false,
            showOnPublicProfile: false,
            genreLogic: 'OR',
            canGenerateMore: true,
            mediaType: 'both',
        })
    })

    it('refuses an empty name and auto-fill without genres', () => {
        const start = formFromCollection(actionPacked)
        expect(validate({ ...start, name: '  ' })).toMatch(/name/)
        expect(validate({ ...start, genres: [], autoFill: true })).toMatch(/genre/)
        expect(validate(start)).toBeNull()
    })
})
