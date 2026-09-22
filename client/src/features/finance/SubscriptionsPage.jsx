import { useRef, useState } from 'react'
import { Link, useOutletContext, useSearchParams } from 'react-router'
import { useLanguage } from '../settings/language.js'
import { useProductivity, useProductivityAction } from '../../shared/api/productivity.js'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { Dialog } from '../../shared/ui/Dialog.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { EmptyState } from '../../shared/ui/EmptyState.jsx'
import { QueryFeedback, ActionFeedback, Pagination } from '../../shared/ui/ProductivityFeedback.jsx'
import { SubscriptionForm } from './SubscriptionForm.jsx'
import shared from '../../shared/ui/Productivity.module.css'
import styles from './SubscriptionsPage.module.css'

export function SubscriptionsPage() {
  const { area } = useOutletContext() || {}
  const { t } = useLanguage()
  if (area && area.key !== 'finance') return <section><p>{t('areaFinanceOnly')}</p><Link to="/areas/finance">{t('areaFinanceBack')}</Link></section>
  return <SubscriptionWorkspace scoped={Boolean(area)} />
}

function SubscriptionWorkspace({ scoped }) {
  const { t, locale, date } = useLanguage()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') === 'Cancelled' ? 'Cancelled' : 'Active'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query = useProductivity(`/finance/subscriptions?status=${status}&page=${page}&pageSize=20`)
  const [editor, setEditor] = useState(null)
  const saving = useRef(false)
  const action = useProductivityAction(() => setParams({ status }))
  const data = query.data
  const money = (value, currency) => new Intl.NumberFormat(locale, { style: 'currency', currency, currencyDisplay: 'code', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  const edit = subscription => { saving.current = false; setEditor(subscription) }
  const close = () => { if (!saving.current) setEditor(null) }
  return <div className={styles.page}>
    {scoped && <Link className={styles.back} to="/areas/finance">{t('areaFinanceBack')}</Link>}
    {scoped ? <header><div className={shared.sectionHeading}><h2>{t('subscriptionTitle')}</h2><Button onClick={() => edit({})} disabled={!data}>{t('subscriptionCreate')}</Button></div><p className={shared.intro}>{t('subscriptionIntro')}</p></header>
      : <PageHeader editorial title={t('subscriptionTitle')} description={t('subscriptionIntro')}
        action={<Button onClick={() => edit({})} disabled={!data}>{t('subscriptionCreate')}</Button>} />}
    <QueryFeedback query={query} />
    {data && <div className={styles.layout}>
      <div>
        <section className={styles.summary} aria-label={t('subscriptionEstimates')}>
          <h2>{t('subscriptionEstimates')}</h2>
          <p className={shared.meta}>{t('subscriptionEstimateHint')}</p>
          <dl className={styles.totals}>{data.totals.map(total => <div key={total.currency}>
            <dt>{total.currency}</dt><dd>{money(total.monthly, total.currency)}<span>{t('subscriptionPerMonth')}</span></dd>
            <dd>{money(total.annual, total.currency)}<span>{t('subscriptionPerYear')}</span></dd>
          </div>)}</dl>
          {!data.totals.length && <p className={shared.meta}>{t('subscriptionNoActiveCosts')}</p>}
          <details><summary>{t('subscriptionCalculation')}</summary><p className={shared.meta}>{t('subscriptionCalculationHint')}</p></details>
        </section>
        <div className={styles.toolbar}>
          <Select label={t('subscriptionView')} value={status} onChange={event => setParams({ status: event.target.value })}>
            <option value="Active">{t('subscriptionActive')}</option><option value="Cancelled">{t('subscriptionCancelled')}</option>
          </Select>
          <p role="status">{t('subscriptionCount', { count: data.total })}</p>
        </div>
        <ActionFeedback action={action} success={t('subscriptionStatusSaved')} />
        {!data.items.length && <EmptyState title={t(status === 'Active' ? 'subscriptionEmpty' : 'subscriptionCancelledEmpty')}>
          {t(status === 'Active' ? 'subscriptionEmptyHint' : 'subscriptionCancelledHint')}
        </EmptyState>}
        <ul className={styles.list}>{data.items.map(subscription => <li className={styles.record} key={subscription.id}>
          <div><h3>{subscription.name}</h3><p>{subscription.category || t('subscriptionUncategorized')}</p>
            <p>{t('subscriptionNext')}: {date(subscription.nextBillingDate)} {subscription.status === 'Active' && subscription.nextBillingDate < data.localDate && <span className={styles.overdue}>{t('subscriptionOverdue')}</span>}</p>
          </div>
          <div className={styles.amount}><strong>{money(subscription.price, subscription.currency)}</strong><p>{t(`subscription${subscription.billingInterval}`)}</p></div>
          {subscription.notes && <details><summary>{t('subscriptionNotes')}</summary><p className={shared.note}>{subscription.notes}</p></details>}
          <footer><Button variant="secondary" onClick={() => edit(subscription)}>{t('subscriptionEditAction')}</Button>
            <Button variant="quiet" loading={action.isPending && action.variables?.path.includes(subscription.id)} disabled={action.isPending}
              onClick={() => action.mutate({ path: `/finance/subscriptions/${subscription.id}/status`, method: 'PUT', body: { status: status === 'Active' ? 'Cancelled' : 'Active' } })}>
              {t(status === 'Active' ? 'subscriptionCancel' : 'subscriptionReactivate')}
            </Button></footer>
        </li>)}</ul>
        <Pagination data={data} setPage={next => setParams({ status, page: String(next) })} />
        <p className={shared.meta}>{t('subscriptionTrackingOnly')}</p>
      </div>
      <aside>
        <section className={styles.upcoming} aria-label={t('subscriptionUpcoming')}><h2>{t('subscriptionUpcoming')}</h2>
          <p className={shared.meta}>{t('subscriptionUpcomingHint')}</p>
          {data.overdueCount > 0 && <p className={styles.overdue}>{t('subscriptionOverdueCount', { count: data.overdueCount })}</p>}
          <ul>{data.upcoming.map(subscription => <li key={subscription.id}>
            <Button variant="quiet" onClick={() => edit(subscription)}>{subscription.name}</Button>
            <p>{date(subscription.nextBillingDate)} {subscription.nextBillingDate < data.localDate && <span className={styles.overdue}>{t('subscriptionOverdue')}</span>}</p>
            <p>{money(subscription.price, subscription.currency)}</p>
          </li>)}</ul>
          {!data.upcoming.length && <p>{t('subscriptionNoUpcoming')}</p>}
        </section>
        {data.categories.length > 0 && <section className={styles.categories}><h2>{t('subscriptionByCategory')}</h2>
          <ul>{data.categories.map(category => <li key={`${category.currency}-${category.category}`}><span>{category.category || t('subscriptionUncategorized')}</span><span>{money(category.monthly, category.currency)} · {t('subscriptionPerMonth')}</span></li>)}</ul>
        </section>}
      </aside>
    </div>}
    <Dialog open={Boolean(editor)} onClose={close} title={t(editor?.id ? 'subscriptionEdit' : 'subscriptionCreate')}>
      {editor && <SubscriptionForm key={editor.id || 'new'} subscription={editor.id ? editor : undefined} localDate={data?.localDate}
        onPendingChange={value => { saving.current = value }} onSaved={() => { saving.current = false; setEditor(null) }} />}
    </Dialog>
  </div>
}
