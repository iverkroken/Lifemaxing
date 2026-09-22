import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useLanguage } from '../settings/language.js'
import { useProductivityAction } from '../../shared/api/productivity.js'
import { Input } from '../../shared/ui/Input.jsx'
import { Select } from '../../shared/ui/Select.jsx'
import { Button } from '../../shared/ui/Button.jsx'
import { ActionFeedback } from '../../shared/ui/ProductivityFeedback.jsx'
import shared from '../../shared/ui/Productivity.module.css'
import styles from './SubscriptionsPage.module.css'

const currencies = ['NOK', 'SEK', 'DKK', 'EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'NZD', 'PLN', 'CZK', 'HUF']
const intervals = ['Weekly', 'Monthly', 'Quarterly', 'Yearly']
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= '1900-01-01' && value <= '9998-12-31'
  && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const schema = z.object({
  name: z.string().trim().min(1, 'subscriptionInvalidName').max(200, 'subscriptionInvalidName'),
  category: z.string().trim().max(80, 'subscriptionInvalidCategory'),
  price: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, 'subscriptionInvalidPrice').transform(Number),
  currency: z.enum(currencies), billingInterval: z.enum(intervals),
  startDate: z.string().refine(validDate, 'subscriptionInvalidDate'),
  nextBillingDate: z.string().refine(validDate, 'subscriptionInvalidDate'),
  notes: z.string().trim().max(2000, 'subscriptionInvalidNotes'),
}).refine(value => value.nextBillingDate >= value.startDate, { path: ['nextBillingDate'], message: 'subscriptionDateOrder' })

export function SubscriptionForm({ subscription, localDate = '', onSaved, onPendingChange }) {
  const { t } = useLanguage()
  const form = useForm({ resolver: zodResolver(schema), defaultValues: {
    name: subscription?.name || '', category: subscription?.category || '', price: subscription ? String(subscription.price) : '',
    currency: subscription?.currency || 'EUR', billingInterval: subscription?.billingInterval || 'Monthly',
    startDate: subscription?.startDate || localDate, nextBillingDate: subscription?.nextBillingDate || localDate, notes: subscription?.notes || '',
  } })
  const action = useProductivityAction(onSaved)
  const error = name => form.formState.errors[name] ? t(form.formState.errors[name].message) : undefined
  return <form className={shared.form} noValidate onSubmit={form.handleSubmit(body => {
    onPendingChange?.(true)
    action.mutate({ path: subscription ? `/finance/subscriptions/${subscription.id}` : '/finance/subscriptions', method: subscription ? 'PUT' : 'POST', body },
      { onSettled: () => onPendingChange?.(false) })
  })}>
    <fieldset className={shared.formFields} disabled={action.isPending}>
      <Input label={t('subscriptionName')} required maxLength={200} error={error('name')} {...form.register('name')} />
      <Input label={t('subscriptionCategory')} maxLength={80} error={error('category')} {...form.register('category')} />
      <div className={styles.formColumns}>
        <Input label={t('subscriptionPrice')} type="number" inputMode="decimal" min="0" max="999999999.99" step="0.01" required error={error('price')} {...form.register('price')} />
        <Select label={t('subscriptionCurrency')} error={error('currency')} {...form.register('currency')}>{currencies.map(currency => <option key={currency}>{currency}</option>)}</Select>
      </div>
      <Select label={t('subscriptionInterval')} error={error('billingInterval')} {...form.register('billingInterval')}>{intervals.map(interval => <option key={interval} value={interval}>{t(`subscription${interval}`)}</option>)}</Select>
      <div className={styles.formColumns}>
        <Input label={t('subscriptionStart')} type="date" min="1900-01-01" max="9998-12-31" required error={error('startDate')} {...form.register('startDate')} />
        <Input label={t('subscriptionNext')} type="date" min="1900-01-01" max="9998-12-31" required error={error('nextBillingDate')} {...form.register('nextBillingDate')} />
      </div>
      <Input label={t('subscriptionNotes')} multiline rows={3} maxLength={2000} error={error('notes')} {...form.register('notes')} />
      <p className={shared.meta}>{t('subscriptionManualDates')}</p>
      <ActionFeedback action={action} />
      <Button type="submit" loading={action.isPending}>{t(subscription ? 'subscriptionSave' : 'subscriptionCreate')}</Button>
    </fieldset>
  </form>
}
