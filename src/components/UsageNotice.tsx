import { useEffect, useRef } from "react";

const USAGE_NOTICE_STORAGE_KEY = "g115b-usage-notice-accepted";

type UsageNoticeProps = {
  open: boolean;
  onClose: () => void;
};

export function hasAcceptedUsageNotice() {
  return localStorage.getItem(USAGE_NOTICE_STORAGE_KEY) === "true";
}

export function UsageNotice({ open, onClose }: UsageNoticeProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function acceptNotice() {
    localStorage.setItem(USAGE_NOTICE_STORAGE_KEY, "true");
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="usage-notice"
      aria-labelledby="usageNoticeTitle"
      aria-describedby="usageNoticeText"
      onCancel={onClose}
    >
      <div className="usage-notice-panel">
        <div className="usage-notice-icon" aria-hidden="true">
          i
        </div>
        <div className="usage-notice-content">
          <h2 id="usageNoticeTitle">Hinweis zur Nutzung</h2>
          <p id="usageNoticeText">
            Die Rechner unterstützen die Flugplanung. Maßgeblich bleiben das
            zugelassene AFM/POH und die Entscheidung des Piloten.
          </p>
          <div className="usage-notice-version">React-Migrationsstand</div>
          <button
            className="usage-notice-confirm"
            type="button"
            onClick={acceptNotice}
          >
            Verstanden
          </button>
        </div>
      </div>
    </dialog>
  );
}

