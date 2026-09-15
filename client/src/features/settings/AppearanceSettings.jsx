import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from './language.js'
import { updateSettings } from './settingsApi.js'
import { Button } from '../../shared/ui/Button.jsx'
import { ThemePreview } from './ThemePreview.jsx'
import styles from './SettingsPage.module.css'

export function AppearanceSettings({ userId }) {
  const { t, preferences, previewAppearance } = useLanguage()
  const client = useQueryClient()
  const save = useMutation({ mutationFn: updateSettings, onSuccess: value => {
    client.setQueryData(['settings', userId], value)
    previewAppearance(null)
  } })
  const change = values => {
    previewAppearance(values)
    save.mutate(values)
  }
  return <section className={styles.panel}><div className={styles.panelBody}>
    <h2>{t('appearance')}</h2><p>{t('appearanceHint')}</p>
    <fieldset className={styles.choices} disabled={save.isPending}><legend>{t('theme')}</legend>
      {['light', 'dark', 'system'].map(theme => <label key={theme} className={styles.themeChoice}>
        <ThemePreview theme={theme} />
        <span><input type="radio" name="theme" value={theme} checked={preferences.theme === theme}
          onChange={() => change({ theme, density: preferences.density })} /> {t(theme)}</span>
      </label>)}
    </fieldset>
    <fieldset className={styles.choices} disabled={save.isPending}><legend>{t('density')}</legend>
      {['normal', 'compact'].map(density => <label key={density} className={styles.densityChoice}>
        <input type="radio" name="density" checked={preferences.density === density}
          onChange={() => change({ density, theme: preferences.theme })} />
        <span>{t(density)}<small>{t(density + 'Hint')}</small></span>
      </label>)}
    </fieldset>
    <p role="status">{t(save.isPending ? 'saving' : save.isError ? 'notSaved' : save.isSuccess ? 'saved' : 'appearanceAutoSave')}</p>
    {save.isError && <Button variant="secondary" onClick={() => save.mutate(save.variables)}>{t('retry')}</Button>}
  </div></section>
}
