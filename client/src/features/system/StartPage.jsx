import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { useSystemStatus } from './useSystemStatus.js'
import styles from './StartPage.module.css'

export function StartPage() {
  const status = useSystemStatus()

  return (
    <>
      <PageHeader eyebrow="A place to begin" title="Make room for what matters."
        description="A personal space to turn plans into action and preserve your progress over time." />
      <Card aria-labelledby="connection-title">
        <div className={styles.heading}>
          <h2 id="connection-title">Connection status</h2>
          <Button variant="secondary" loading={status.isFetching} onClick={() => status.refetch()}>
            Check again
          </Button>
        </div>
        <div aria-live="polite" aria-busy={status.isFetching}>
          {status.isPending && <p>Checking your connection…</p>}
          {status.isError && <p role="alert" className={styles.error}>
            We could not confirm the connection. Please check that the services are running and try again.
          </p>}
          {status.isSuccess && <dl className={styles.statusList}>
            <div><dt>Application</dt><dd>{status.data.api === 'available' ? 'Connected' : 'Unavailable'}</dd></div>
            <div><dt>Database</dt><dd>{status.data.database === 'available' ? 'Connected' : 'Not configured'}</dd></div>
          </dl>}
        </div>
      </Card>
    </>
  )
}
