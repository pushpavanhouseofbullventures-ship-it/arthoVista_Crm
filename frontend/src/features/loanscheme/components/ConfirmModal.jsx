export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-content confirm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-icon-wrap">
          {type === 'danger' && <div className="confirm-icon danger">🗑️</div>}
          {type === 'warning' && <div className="confirm-icon warning">⚠️</div>}
          {type === 'info' && <div className="confirm-icon info">ℹ️</div>}
        </div>
        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="pill-btn outline" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`pill-btn ${type === 'danger' ? 'btn-danger-gradient' : 'btn-funding'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
