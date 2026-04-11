import PropTypes from 'prop-types';

const ImportIssuesDialog = ({
  isOpen,
  rows,
  onClose,
  onFieldChange,
  onRetryImport,
  onDownloadRows,
  isRetrying,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Rows Not Imported</h3>
            <p className="text-sm text-slate-500 mt-1">
              Fix required fields and retry import for these rows.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            disabled={isRetrying}
            aria-label="Close import issues dialog"
          >
            x
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          {rows.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-500 text-sm">
              No rows to fix.
            </div>
          )}

          {rows.map((row, rowIndex) => (
            <div key={`${row.rowNumber}-${rowIndex}`} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <p className="text-sm font-semibold text-slate-800">Row {row.rowNumber}</p>
                <p className="text-xs text-amber-700 font-medium">
                  Missing: {row.missingFields.join(', ')}
                </p>
              </div>

              <p className="text-xs text-slate-600 mb-3">{row.message}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-700">URL</span>
                  <input
                    value={row.draft.url}
                    onChange={(event) => onFieldChange(rowIndex, 'url', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="https://example.com"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Username</span>
                  <input
                    value={row.draft.username}
                    onChange={(event) => onFieldChange(rowIndex, 'username', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="username"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Password</span>
                  <input
                    value={row.draft.password}
                    onChange={(event) => onFieldChange(rowIndex, 'password', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="password"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-slate-700">Note (optional)</span>
                  <input
                    value={row.draft.note}
                    onChange={(event) => onFieldChange(rowIndex, 'note', event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="note"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDownloadRows}
            disabled={isRetrying || rows.length === 0}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Download Failed Rows CSV
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isRetrying}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onRetryImport}
            disabled={isRetrying || rows.length === 0}
            className="rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {isRetrying ? 'Importing...' : 'Import Fixed Rows'}
          </button>
        </div>
      </div>
    </div>
  );
};

ImportIssuesDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      rowNumber: PropTypes.number.isRequired,
      missingFields: PropTypes.arrayOf(PropTypes.string).isRequired,
      message: PropTypes.string.isRequired,
      draft: PropTypes.shape({
        url: PropTypes.string.isRequired,
        username: PropTypes.string.isRequired,
        password: PropTypes.string.isRequired,
        note: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onFieldChange: PropTypes.func.isRequired,
  onRetryImport: PropTypes.func.isRequired,
  onDownloadRows: PropTypes.func.isRequired,
  isRetrying: PropTypes.bool.isRequired,
};

export default ImportIssuesDialog;
