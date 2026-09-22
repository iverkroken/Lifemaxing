import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { ActionFeedback, Pagination, QueryFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { useLanguage } from './language.js'
import styles from './RecentlyDeletedPage.module.css'

const tabs = [['', 'All'], ['task', 'Tasks'], ['habit', 'Habits'], ['goal', 'Goals'], ['lifeArea', 'Life Areas']]
const typeLabels = { task: 'Task', habit: 'Habit', goal: 'Goal', lifeArea: 'Life Area' }

export function RecentlyDeletedPage() {
  const { t, dateTime } = useLanguage()
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState(null)
  const queryClient = useQueryClient()
  const query = useProductivity(`/recently-deleted?page=${page}&pageSize=30${type ? `&type=${type}` : ''}`)
  const action = useProductivityAction(() => queryClient.invalidateQueries({ queryKey: ['areas'] }))
  const serverNow = query.data?.serverNowUtc ? new Date(query.data.serverNowUtc) : null
  const days = (from, to, round) => Math.max(0, round((new Date(to) - new Date(from)) / 86400000))
  const restore = item => action.mutate({ path: `/recently-deleted/${item.type}/${item.id}/restore`, method: 'POST' })
  const purge = item => action.mutate({ path: `/recently-deleted/${item.type}/${item.id}`, method: 'DELETE' }, { onSuccess: () => setConfirming(null) })

  return <div className={styles.page}>
    <PageHeader editorial title={t('Recently Deleted')} description={t('recentlyDeletedHint')} />
    <nav className={styles.tabs} aria-label={t('Recently Deleted')}>{tabs.map(([value, label]) => <button key={label}
      aria-current={type === value ? 'page' : undefined} onClick={() => { setType(value); setPage(1) }}>{t(label)}</button>)}</nav>
    <QueryFeedback query={query} />{!confirming && <ActionFeedback action={action} />}
    {query.data?.total === 0 && <EmptyState title={t('Nothing here')}>{t('recentlyDeletedEmpty')}</EmptyState>}
    <ul className={styles.list}>{query.data?.items.map(item => {
      const ago = days(item.deletedAtUtc, serverNow, Math.floor)
      const remaining = days(serverNow, item.expiresAtUtc, Math.ceil)
      return <li key={`${item.type}-${item.id}`} className={styles.row}>
        <div className={styles.identity}><span className={styles.type}>{t(typeLabels[item.type])}</span><strong>{item.title}</strong>{item.lifeAreaName && <span>{item.lifeAreaName}</span>}</div>
        <div className={styles.retention}><span>{ago === 0 ? t('Deleted today') : t('deletedAgo', { count: ago })}</span><span>{t('deletesIn', { count: remaining })}</span><time dateTime={item.deletedAtUtc}>{dateTime(item.deletedAtUtc)}</time></div>
        <div className={styles.actions}><Button variant="secondary" loading={action.isPending} onClick={() => restore(item)}>{t('Restore')}</Button><Button variant="dangerQuiet" disabled={action.isPending} onClick={() => setConfirming(item)}>{t('Delete permanently')}</Button></div>
      </li>
    })}</ul>
    <Pagination data={query.data} setPage={setPage} />
    <Dialog open={Boolean(confirming)} onClose={() => setConfirming(null)} title={t('permanentDeleteTitle', { type: t(typeLabels[confirming?.type] || 'item').toLocaleLowerCase() })}>
      {confirming && <div className={styles.confirm}><p><strong>{confirming.title}</strong></p><p>{t('permanentDeleteHint')}</p><ActionFeedback action={action} /><div className={styles.actions}><Button variant="secondary" onClick={() => setConfirming(null)}>{t('Cancel')}</Button><Button variant="danger" loading={action.isPending} onClick={() => purge(confirming)}>{t('Delete permanently')}</Button></div></div>}
    </Dialog>
  </div>
}
