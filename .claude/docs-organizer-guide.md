# Documentation Organization Guide for Docs-Organizer Agent

## Overview

This guide provides comprehensive instructions for the **docs-organizer agent** on maintaining, organizing, and updating all documentation in the NetTrailers project.

## Documentation Structure

```
net_trailers/
├── README.md                    # Project overview and setup (root)
├── CLAUDE.md                    # Claude Code AI instructions (root)
├── CHANGELOG.md                 # Written by release-kit (npm run release); never edit by hand
├── .claude/
│   └── docs-organizer-guide.md           # This file
└── docs/
    ├── INDEX.md                 # Complete documentation navigation index
    ├── README.md                # Docs folder overview
    ├── current/                 # Active, maintained documentation
    │   ├── ARCHITECTURE_QUICK_REFERENCE.md
    │   ├── PROJECT_ARCHITECTURE_ANALYSIS.md
    │   ├── API_DOCUMENTATION.md
    │   ├── FEATURE_ROADMAP_2025.md
    │   ├── NOTIFICATION_SYSTEM.md
    │   ├── RECOMMENDATION_ENGINE.md
    │   ├── AUTO_UPDATE_COLLECTIONS.md
    │   ├── INTERACTION_TRACKING.md
    │   ├── PIN_PROTECTION_FEATURE.md
    │   └── IMAGE_COMPRESSION.md
    └── archive/                 # Historical reference materials
        ├── code-reviews/        # Quality assessments
        ├── implementation/      # Session notes and progress
        ├── planning/            # Feature plans and migrations
        ├── security/            # Security audits
        └── smart-rows/          # Feature-specific docs
```

## Document Categories

### Root Files (3 Essential Files Only)

**Location**: Project root (`/`)

**Purpose**: Core project documentation that must be immediately accessible

**Files**:

1. **README.md** - Project overview, setup instructions, features
2. **CLAUDE.md** - Instructions for Claude Code AI (development commands, architecture notes)
3. **CHANGELOG.md** - Version history, written by release-kit from the commits
    - **CRITICAL**: Never edit it by hand; the `/changelog` page renders it (see RELEASING.md)

**Rules**:

- Keep root clean - only these 3 files should be in root
- Never move these files to `/docs` folder
- Update regularly to reflect current state

### Current Documentation (`docs/current/`)

**Purpose**: Active, maintained documentation that reflects the current production state

**When to use**:

- Architecture guides and system design
- API documentation
- Feature documentation for live features
- Technical references actively used in development

**Maintenance**:

- Update when code changes affect the documented systems
- Keep synchronized with CLAUDE.md
- Review quarterly for accuracy

**Current Files**:

- `ARCHITECTURE_QUICK_REFERENCE.md` - Start here guide for new developers
- `PROJECT_ARCHITECTURE_ANALYSIS.md` - Detailed architecture insights
- `API_DOCUMENTATION.md` - API routes and usage
- `FEATURE_ROADMAP_2025.md` - Feature planning
- Feature-specific docs (notifications, recommendations, etc.)

### Archive Documentation (`docs/archive/`)

**Purpose**: Historical reference materials - valuable but not actively updated

**Categories**:

1. **code-reviews/** - Code quality assessments
    - Code review reports
    - Architecture assessments
    - Quality improvement recommendations

2. **implementation/** - Session summaries and progress tracking
    - Development session notes
    - Implementation status
    - Progress summaries
    - Bug fix history

3. **planning/** - Feature plans and migration strategies
    - Feature implementation plans
    - Migration strategies
    - Technical uplift analysis
    - Improvement action items

4. **security/** - Security audits and remediation
    - Security vulnerability audits
    - Remediation tracking
    - Security fixes

5. **smart-rows/** - Smart Rows Builder feature documentation
    - Architecture design
    - AI integration
    - Flow documentation

**Rules**:

- Documents moved to archive are **reference only** (not actively updated)
- Preserve history - never delete archived docs
- Add archive notice when moving docs from current to archive

### Documentation Index (`docs/INDEX.md`)

**Purpose**: Central navigation for all project documentation

**When to update**:

- Adding new documentation files
- Moving files between current/archive
- Reorganizing doc structure
- Updating last modified dates

**Structure**:

- Documentation structure overview
- Current documentation table
- Archive documentation by category
- Quick navigation by role
- Statistics (total files, current/archive counts)

**Maintenance checklist**:

- [ ] Update file count statistics
- [ ] Add new files to appropriate section
- [ ] Update "Last Updated" dates
- [ ] Keep navigation links accurate
- [ ] Update "Last reorganized" date

## Special Documentation: CHANGELOG.md

**CRITICAL**: CHANGELOG.md is written by release-kit, never by hand.

- Each release (`npm run release`, or the weekly release train) adds a section built from the `feat`, `fix`, `perf` and `security` commits since the last one.
- The `/changelog` page renders the file at build time (`app/changelog/parseChangelog.ts`).
- To change what a release says, write a better commit subject or a `Release-note:` line in the commit body (RELEASING.md), not the file.
- The hand-written notes below the release-kit sections are historical; leave them as they are.

## Documentation Lifecycle Workflow

### Adding New Documentation

1. **Determine category**:
    - Is it active reference? → `docs/current/`
    - Is it historical? → `docs/archive/{category}/`
    - Is it essential? → Root (rarely - check with team first)

2. **Choose filename**:
    - Use UPPER_SNAKE_CASE for major docs
    - Include purpose in name (e.g., `CODE_REVIEW_`, `FEATURE_`)
    - Add dates to session/progress docs

3. **Create the file**:
    - Add clear purpose/overview at top
    - Use markdown headers for navigation
    - Include "Last Updated" date

4. **Update INDEX.md**:
    - Add to appropriate table
    - Update statistics
    - Update "Last reorganized" date

### Moving Docs to Archive

When documentation becomes historical (feature completed, plan executed, etc.):

1. **Add archive notice** to top of file:

```markdown
> **ARCHIVED:** This document is historical reference. See [current docs](../current/) for active documentation.
> Archived on: YYYY-MM-DD
> Reason: [Brief reason for archiving]
```

2. **Move file** to appropriate archive subdirectory:
    - `docs/archive/code-reviews/`
    - `docs/archive/implementation/`
    - `docs/archive/planning/`
    - `docs/archive/security/`
    - `docs/archive/smart-rows/`

3. **Update INDEX.md**:
    - Remove from current section
    - Add to archive section
    - Update statistics

4. **Update related docs** that reference this file

### Updating Existing Documentation

**When code changes**:

1. Update affected docs in `docs/current/`
2. Update CLAUDE.md if architecture/commands change
3. Leave CHANGELOG.md alone: release-kit writes it from the commits
4. Update README.md if setup/features change

**Regular maintenance**:

- Review `docs/current/` quarterly
- Check all internal links are valid
- Update statistics in INDEX.md
- Verify examples still work

## File Naming Conventions

### Major Documentation

- Format: `UPPER_SNAKE_CASE.md`
- Examples:
    - `ARCHITECTURE_QUICK_REFERENCE.md`
    - `API_DOCUMENTATION.md`
    - `CODE_REVIEW_2025.md`

### Session/Progress Docs

- Format: `lowercase_with_underscores.md` or include date
- Examples:
    - `recent_changes.md`
    - `session_summary.md`
    - `trending-cron-implementation.md`

### Feature-Specific Docs

- Format: `FEATURE_NAME_TYPE.md`
- Examples:
    - `SMART_ROW_BUILDER_ARCHITECTURE.md`
    - `NOTIFICATION_SYSTEM.md`
    - `RANKING_GENERATOR_QUICK_REFERENCE.md`

## Content Guidelines

### Headers and Structure

**Use clear hierarchy**:

```markdown
# Document Title (H1 - once per file)

## Major Section (H2)

### Subsection (H3)

#### Detail (H4 - use sparingly)
```

**Include metadata at top**:

```markdown
# Document Title

> **Last Updated:** YYYY-MM-DD
> **Status:** Active | Archived | In Progress
> **Purpose:** Brief description
```

### Code Examples

**Always include**:

- Language identifier for syntax highlighting
- Comments explaining purpose
- File paths for context

```typescript
// components/example/Component.tsx
export function Component() {
    // Implementation
}
```

### Cross-References

**Link to related docs**:

```markdown
See [ARCHITECTURE_QUICK_REFERENCE.md](../current/ARCHITECTURE_QUICK_REFERENCE.md) for details.
```

**Link to code**:

```markdown
Implementation: `components/modals/ContentModal.tsx:42`
```

### Tables

**Use for structured data**:

```markdown
| Document | Description | Status |
| -------- | ----------- | ------ |
| File.md  | Purpose     | Active |
```

## Integration with CLAUDE.md

**CLAUDE.md** is the source of truth for:

- Development commands
- Architecture overview
- State management patterns
- API documentation
- Testing guidelines

**When to update both**:

- Architecture changes → Update CLAUDE.md AND `docs/current/ARCHITECTURE_QUICK_REFERENCE.md`
- New API routes → Update CLAUDE.md AND `docs/current/API_DOCUMENTATION.md`
- New features → Update CLAUDE.md AND create feature doc in `docs/current/`

**Rule**: CLAUDE.md is concise reference, `docs/current/` can be more detailed

## Quality Checklist

Before finalizing documentation updates:

- [ ] Clear purpose/overview at top
- [ ] Proper markdown formatting
- [ ] Code examples have syntax highlighting
- [ ] All links are valid
- [ ] INDEX.md updated if files added/moved
- [ ] Statistics updated in INDEX.md
- [ ] "Last Updated" date current
- [ ] Spelling and grammar checked
- [ ] Examples tested and working

## Special Instructions by Doc Type

### CHANGELOG.md

- Written by release-kit (`npm run release`); never edit it by hand
- The `/changelog` page renders it, so it is directly visible to users

### CLAUDE.md

- Keep concise - this is loaded frequently by AI
- Use clear sections with headers
- Include code examples for common patterns
- Update when architecture changes

### INDEX.md

- Maintain table format
- Keep statistics accurate
- Update after any doc reorganization
- Ensure all links work

### README.md

- Keep setup instructions current
- Update feature list when features launch
- Include screenshots if helpful
- Test setup instructions on clean install

## Statistics Tracking

Track in `docs/INDEX.md`:

- Total documentation files
- Current docs count
- Archived docs count (by category)
- Last reorganization date

Update when:

- Adding new docs
- Moving to archive
- Deleting docs
- Reorganizing structure

## Common Mistakes to Avoid

❌ **Don't**:

- Add too many files to root directory
- Forget to update INDEX.md when adding docs
- Leave broken links
- Create duplicate documentation
- Archive docs without adding archive notice
- Modify archived docs (they're historical reference)
- Edit CHANGELOG.md (release-kit writes it)

✅ **Do**:

- Keep root directory clean (3 files only)
- Update INDEX.md for all changes
- Verify links before committing
- Consolidate duplicate content
- Add clear archive notices
- Preserve archived docs as-is

## Summary

**Your role as docs-organizer agent**:

1. **Maintain structure** - Keep docs organized in current/archive categories
2. **Update INDEX.md** - Reflect all documentation changes
3. **Archive old docs** - Move completed/historical docs to archive with notices
4. **Keep current docs fresh** - Update active documentation when code changes
5. **Follow conventions** - Use proper naming, formatting, and linking
6. **Verify quality** - Check links, examples, and accuracy before finalizing

**Priority order**:

1. CLAUDE.md (used by AI for development)
2. docs/current/ (active references)
3. INDEX.md (navigation)
4. README.md (project overview)
5. Archive maintenance (lower priority - reference only)

**When in doubt**:

- Preserve existing structure
- Add archive notices before moving files
- Update INDEX.md for any changes
- Never edit CHANGELOG.md: release-kit writes it
- Ask before making major reorganizations
