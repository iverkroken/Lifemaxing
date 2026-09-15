import { useLanguage } from '../../features/settings/language.js'
import { useEffect, useId, useRef } from 'react'
import { Button } from './Button.jsx'
import { Icon } from './Icon.jsx'
import styles from './Dialog.module.css'

export function Dialog({ open, onClose, title, children, initialFocusRef, placement = 'center' }) {
  const { t } = useLanguage()
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) {
      dialog.showModal()
      // React mounts children before showModal; focus an editable field only once it is visible.
      const field = initialFocusRef?.current || dialog.querySelector('input:not([type="checkbox"]), textarea') || dialog.querySelector('select')
      field?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, initialFocusRef])
  useEffect(() => {
    if (!open) return
    const previous = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = previous }
  }, [open])
  const containTab = event => {
    if (event.key !== 'Tab') return
    const controls = [...ref.current.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')]
      .filter(control => !control.disabled && control.tabIndex >= 0 && control.getClientRects().length > 0)
    const first = controls[0]
    const last = controls.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return <dialog ref={ref} className={styles.dialog} data-placement={placement} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }} onClose={onClose} onKeyDown={containTab}
    onClick={event => {
      if (placement !== 'drawer' || event.target !== event.currentTarget) return
      const bounds = event.currentTarget.getBoundingClientRect()
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
    }}>
    <header className={styles.heading}><h2 id={titleId}>{title}</h2>
      <Button variant="ghost" aria-label={t("Close dialog")} onClick={onClose}><Icon name="close" /></Button>
    </header>
    {open && children}
  </dialog>
}
