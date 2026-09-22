import { Dialog } from './Dialog.jsx'
import { Button } from './Button.jsx'
import { ActionFeedback } from './ProductivityFeedback.jsx'
import { useProductivityAction } from '../api/productivity.js'
import { useLanguage } from '../../features/settings/language.js'

export function DeleteEntityDialog({ open, onClose, onDeleted, type, title, path }) {
  const { t } = useLanguage()
  const action = useProductivityAction(() => { onClose(); onDeleted?.() })
  const label = type[0].toUpperCase() + type.slice(1)
  return <Dialog open={open} onClose={onClose} title={t(`Delete ${type}?`)}>
    <p><strong>{title}</strong> {t('deleteSoftHint')}</p>
    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
      <Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button>
      <Button variant="danger" loading={action.isPending} onClick={() => action.mutate({ path, method: 'DELETE' })}>{t(`Delete ${label}`)}</Button>
    </div>
    <ActionFeedback action={action} />
  </Dialog>
}
