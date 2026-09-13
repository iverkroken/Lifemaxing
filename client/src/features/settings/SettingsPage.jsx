import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useOutletContext } from 'react-router'
import { z } from 'zod'
import { Button } from '../../shared/ui/Button.jsx'
import { Card } from '../../shared/ui/Card.jsx'
import { Input } from '../../shared/ui/Input.jsx'
import { PageHeader } from '../../shared/ui/PageHeader.jsx'
import { getSettings, updateSettings } from './settingsApi.js'
import styles from './SettingsPage.module.css'

const settingsSchema = z.object({
  timeZoneId: z.string().min(1, 'Enter an IANA time zone.'),
  locale: z.string().min(1, 'Enter a locale.'),
})

export function SettingsPage() {
  const { user } = useOutletContext()
  const queryClient = useQueryClient()
  const queryKey = ['settings', user.id]
  const settings = useQuery({ queryKey, queryFn: ({ signal }) => getSettings(signal) })
  const form = useForm({ resolver: zodResolver(settingsSchema), defaultValues: { timeZoneId: '', locale: '' } })
  useEffect(() => {
    if (settings.data) form.reset(settings.data)
  }, [form, settings.data])
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: saved => {
      queryClient.setQueryData(queryKey, saved)
      queryClient.invalidateQueries({ queryKey: ['productivity'] })
      form.reset(saved)
    },
  })

  return <>
    <PageHeader title="Settings" description="Calendar dates use your saved time zone and locale." />
    {settings.isPending && <p aria-live="polite">Loading settings…</p>}
    {settings.isError && <Card><p role="alert" className={styles.error}>Settings could not be loaded.</p>
      <Button variant="secondary" onClick={() => settings.refetch()}>Try again</Button></Card>}
    {settings.isSuccess && <Card>
      <form className={styles.form} onSubmit={form.handleSubmit(values => mutation.mutate(values))} noValidate>
        <Input label="Time zone" hint="Use an IANA identifier such as Europe/Oslo." required
          error={form.formState.errors.timeZoneId?.message || mutation.error?.errors?.timeZoneId?.[0]}
          {...form.register('timeZoneId')} />
        <Input label="Locale" hint="Use a specific locale such as nb-NO." required
          error={form.formState.errors.locale?.message || mutation.error?.errors?.locale?.[0]}
          {...form.register('locale')} />
        {mutation.isError && !mutation.error.errors && <p role="alert" className={styles.error}>{mutation.error.message}</p>}
        {mutation.isSuccess && <p role="status" className={styles.saved}>Settings saved.</p>}
        <Button type="submit" loading={mutation.isPending} disabled={!form.formState.isDirty}>Save settings</Button>
      </form>
    </Card>}
  </>
}
