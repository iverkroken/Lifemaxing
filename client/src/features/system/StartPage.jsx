import { useLanguage } from '../settings/language.js'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { useSystemStatus } from './useSystemStatus.js'
import styles from './StartPage.module.css'

export function StartPage() {
  const { t } = useLanguage()
  const status = useSystemStatus()

  return (
    <>
      <PageHeader eyebrow={t("A place to begin")} title={t("Make room for what matters.")}
        description={t("A personal space to turn plans into action and preserve your progress over time.")} />
      <Card aria-labelledby="connection-title">
        <div className={styles.heading}>
          <h2 id="connection-title">{t("Connection status")}</h2>
          <Button variant="secondary" loading={status.isFetching} onClick={() => status.refetch()}>{t("Check again")}</Button>
        </div>
        <div aria-live="polite" aria-busy={status.isFetching}>
          {status.isPending && <p>{t("Checking your connection…")}</p>}
          {status.isError && <p role="alert" className={styles.error}>{t("We could not confirm the connection. Please check that the services are running and try again.")}</p>}
          {status.isSuccess && <dl className={styles.statusList}>
            <div><dt>{t("Application")}</dt><dd>{status.data.api === 'available' ? t("Connected") : t("Unavailable")}</dd></div>
            <div><dt>{t("Database")}</dt><dd>{status.data.database === 'available' ? t("Connected") : t("Not configured")}</dd></div>
          </dl>}
        </div>
      </Card>
    </>
  )
}
