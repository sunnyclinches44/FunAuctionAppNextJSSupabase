'use client'

import { useEffect } from 'react'

interface ConfirmDialogProps {
  title: string
  body: string
  confirmLabel: string
  cancelLabel?: string
  /** Shown inside the dialog when the action failed, instead of a second pop-up. */
  error?: string | null
  isBusy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A yes/no dialog drawn by the app itself.
 *
 * The browser's own confirm() and alert() put the site's address at the top
 * of the box ("<host> says"), which reads as a warning from the browser
 * rather than a question from the auction. This looks like the rest of the
 * room, and it is the only pop-up in the flow: the outcome is reported here
 * or not at all.
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  error = null,
  isBusy = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, isBusy])

  return (
    <div className="modal-backdrop" onClick={() => !isBusy && onCancel()} role="presentation">
      <div
        className="modal animate-rise"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="display text-base">{title}</span>
            <p className="text-sm text-ink-2 m-0">{body}</p>
          </div>

          {error && <p className="text-sm text-danger m-0">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} disabled={isBusy} className="btn btn-ghost">
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm} disabled={isBusy} className="btn btn-primary">
              {isBusy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
