import PreferencesPage from './preferences/page'

/**
 * `/settings`: on phones the section menu alone (SettingsFrame hides the
 * panel); on wide screens the menu beside the default section, Preferences.
 */
export default function SettingsIndexPage() {
    return <PreferencesPage />
}
