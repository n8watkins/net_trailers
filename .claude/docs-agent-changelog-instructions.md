# Instructions for Docs-Organizer Agent: Updating CHANGELOG.md

## Overview

The `/changelog` page in the NetTrailers app is **dynamically connected** to `CHANGELOG.md`. When you update the CHANGELOG.md file, those changes automatically appear on the website at `/changelog`.

## How It Works

1. **CHANGELOG.md** (root directory) - The source of truth
2. **API Route** (`/api/changelog`) - Parses CHANGELOG.md and returns JSON
3. **Changelog Page** (`/app/changelog/page.tsx`) - Fetches from API and renders dynamically

## CHANGELOG.md Format

The changelog MUST follow the [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

## [Unreleased] - YYYY-MM-DD - Short Title

### Section Name

- List item with description
    - Sub-items are indented with 4 spaces
- **BOLD TEXT:** Can be used for emphasis
- Another item

### Another Section

- More items

---

## [1.7.0] - YYYY-MM-DD - Release Title

### Added

- New features

### Changed

- Modifications to existing features

### Fixed

- Bug fixes

### Security

- Security improvements
```

## Important Rules

### Version Header Format

```
## [Version] - Date - Title
```

- **REQUIRED**: Two spaces around each dash
- **REQUIRED**: Square brackets around version number
- **Version**: Can be a number (1.6.0) or "Unreleased"
- **Date**: Any format, typically YYYY-MM-DD
- **Title**: Brief description

✅ **CORRECT**:

```markdown
## [Unreleased] - 2025-11-19 - Security & Privacy Improvements

## [1.7.0] - January 20, 2025 - New Features
```

❌ **WRONG**:

```markdown
## [1.7.0]- 2025-01-20- Missing spaces

## 1.7.0 - 2025-01-20 - Missing brackets

## [1.7.0] -2025-01-20 - Wrong spacing
```

### Section Headers

```markdown
### Section Name
```

**Common sections** (use these when applicable):

- **Security** - Security fixes (use for critical fixes)
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Technical** - Technical improvements

### List Items

```markdown
- Main item text
    - Sub-item (4 spaces indent)
    - Another sub-item
- **BOLD PREFIX:** Rest of text
```

**Rules**:

- Start with `-` and a space
- Sub-items: indent with exactly 4 spaces before `-`
- Use `**text**` for bold emphasis
- Keep items concise but descriptive

## When to Update CHANGELOG.md

### Always Add to "Unreleased" Section

When you update documentation about recent code changes:

1. Look for existing `## [Unreleased]` section
2. If it doesn't exist, create it at the top (after the header)
3. Add your changes to appropriate sections
4. Use current date: `## [Unreleased] - YYYY-MM-DD - Descriptive Title`

### Creating New Version Releases

When a version is officially released:

1. Change `[Unreleased]` to `[1.x.0]` with proper version number
2. Update the date to release date
3. Create a new `[Unreleased]` section above it for future changes

## Examples

### Adding Security Fixes

```markdown
## [Unreleased] - 2025-11-19 - Security & Privacy Improvements

### Security

- **CRITICAL FIX: Removed client-side API calls**
    - Eliminated API key exposure in ContentImage.tsx
    - All API calls now server-side only
    - Images fallback gracefully without client-side fetches
```

### Adding Breaking Changes

```markdown
## [Unreleased] - 2025-11-20 - Major Refactor

### Changed

- **BREAKING: Renamed authentication methods**
    - `loginUser()` renamed to `authenticateUser()`
    - `logoutUser()` renamed to `deauthenticateUser()`
    - Update all imports to use new method names
```

### Adding Multiple Changes

```markdown
## [Unreleased] - 2025-11-20 - Multiple Improvements

### Added

- New dark mode toggle in settings
- Email notification preferences

### Fixed

- Search bar not clearing after navigation
- Modal backdrop z-index conflict
- TypeScript errors in notification store

### Technical

- Improved type safety across stores
- Reduced bundle size by 15%
```

## What NOT to Do

❌ Don't modify old version entries (they're historical records)
❌ Don't skip the date in version headers
❌ Don't use inconsistent section names
❌ Don't forget the spaces around dashes in headers
❌ Don't create sections without any list items
❌ Don't use tabs (use spaces for indentation)

## Verification

After updating CHANGELOG.md, verify:

1. **Format Check**: Does it match the examples above?
2. **Version Header**: Two spaces around each dash?
3. **Sections**: Are section names clear and standard?
4. **List Items**: Do they start with `- ` (dash + space)?
5. **Bold Text**: Used appropriately for emphasis?

## Testing

The changes will appear on `/changelog` page automatically. The API caches for 5 minutes, so changes may take up to 5 minutes to appear on the website.

## Summary

**Key Points**:

1. Always update CHANGELOG.md when documenting code changes
2. Use "Unreleased" section for ongoing development
3. Follow the exact header format: `## [Version] - Date - Title`
4. Use standard section names (Security, Added, Changed, Fixed, etc.)
5. Keep entries clear, concise, and descriptive
6. Changes automatically sync to `/changelog` page

**Your Role**:
When documenting recent changes to the codebase, ALWAYS update CHANGELOG.md following this format. This ensures the changelog is always up-to-date and displays correctly on the website.
