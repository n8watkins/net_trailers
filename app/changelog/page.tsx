// CHANGELOG.md is bundled as text at build time (next.config.js): the Worker has
// no filesystem to read it from at runtime. release-kit writes it on every
// release (RELEASING.md), so the page and its numbers follow the file.
import changelogMarkdown from '../../CHANGELOG.md'
import ChangelogView from './ChangelogView'
import { changelogStats, parseChangelog } from './parseChangelog'

const changelog = parseChangelog(changelogMarkdown)
const stats = changelogStats(changelog)

export default function ChangelogPage() {
    return <ChangelogView changelog={changelog} stats={stats} />
}
