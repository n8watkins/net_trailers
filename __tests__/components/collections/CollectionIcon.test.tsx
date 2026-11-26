import { render } from '@testing-library/react'
import CollectionIcon from '../../../components/collections/CollectionIcon'

describe('CollectionIcon', () => {
    it('shows the bookmark for Watch Later even when an account stored the TV emoji', () => {
        const { container } = render(
            <CollectionIcon
                collection={{
                    id: 'default-watchlist',
                    emoji: '📺',
                    collectionType: 'manual',
                    color: '#e50914',
                }}
            />
        )
        expect(container.querySelector('svg')).not.toBeNull()
        expect(container.textContent).not.toContain('📺')
    })

    it('still shows the emoji of a custom collection', () => {
        const { container } = render(
            <CollectionIcon
                collection={{ id: 'c1', emoji: '🎬', collectionType: 'manual', color: '#e50914' }}
            />
        )
        expect(container.textContent).toContain('🎬')
        expect(container.querySelector('svg')).toBeNull()
    })
})
