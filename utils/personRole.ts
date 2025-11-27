export type PersonRoleFilter = 'acting' | 'directing' | 'writing' | 'production' | 'other_crew'

export function getRoleFilterForDepartment(
    department?: string | null
): PersonRoleFilter | undefined {
    if (!department) return undefined
    const normalized = department.toLowerCase()

    if (normalized === 'acting') return 'acting'
    if (normalized === 'directing') return 'directing'
    if (normalized === 'writing') return 'writing'
    if (normalized === 'production') return 'production'

    return undefined
}
