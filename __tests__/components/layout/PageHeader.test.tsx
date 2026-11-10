import { fireEvent, render, screen } from '@testing-library/react'
import PageHeader from '../../../components/layout/PageHeader'
import { FilterPills } from '../../../components/layout/PageToolbar'

describe('PageHeader', () => {
    it('renders one 32px title with actions and no subtitle', () => {
        render(<PageHeader title="My Ratings" actions={<button>Manage</button>} />)
        const heading = screen.getByRole('heading', { level: 1, name: 'My Ratings' })
        expect(heading.className).toContain('text-[2rem]')
        expect(screen.getByRole('button', { name: 'Manage' })).toBeTruthy()
    })
})

describe('FilterPills', () => {
    it('marks the selected pill and reports changes', () => {
        const onChange = jest.fn()
        render(
            <FilterPills
                label="Show"
                value="like"
                onChange={onChange}
                options={[
                    { value: 'like', label: 'Liked' },
                    { value: 'dislike', label: 'Disliked' },
                ]}
            />
        )
        expect(screen.getByRole('radio', { name: 'Liked' }).getAttribute('aria-checked')).toBe(
            'true'
        )
        fireEvent.click(screen.getByRole('radio', { name: 'Disliked' }))
        expect(onChange).toHaveBeenCalledWith('dislike')
    })
})
