import PropTypes from 'prop-types';

const PasswordDialog = ({
  isOpen,
  editingId,
  form,
  onChange,
  isPasswordVisible,
  onTogglePasswordVisibility,
  passwordStrength,
  showValidation,
  validationMessage,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Password' : 'Add Password'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            x
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Website URL</span>
            <input
              value={form.url}
              onChange={onChange}
              name="url"
              placeholder="https://example.com"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Username</span>
            <input
              value={form.username}
              onChange={onChange}
              name="username"
              placeholder="username"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="mt-1 relative">
              <input
                value={form.password}
                onChange={onChange}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                placeholder="Password"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="button"
                onClick={onTogglePasswordVisibility}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                {isPasswordVisible ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${passwordStrength.badgeClass}`}>
                {passwordStrength.label}
              </span>
              <div className="h-2 flex-1 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full ${passwordStrength.barClass}`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Note (optional)</span>
            <textarea
              value={form.note}
              onChange={onChange}
              name="note"
              rows={3}
              placeholder="Additional context"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          {showValidation && validationMessage && <p className="text-xs text-red-600">{validationMessage}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : editingId ? 'Update Password' : 'Save Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

PasswordDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  editingId: PropTypes.string,
  form: PropTypes.shape({
    url: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    password: PropTypes.string.isRequired,
    note: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  isPasswordVisible: PropTypes.bool.isRequired,
  onTogglePasswordVisibility: PropTypes.func.isRequired,
  passwordStrength: PropTypes.shape({
    label: PropTypes.string.isRequired,
    badgeClass: PropTypes.string.isRequired,
    barClass: PropTypes.string.isRequired,
    score: PropTypes.number.isRequired,
  }).isRequired,
  showValidation: PropTypes.bool.isRequired,
  validationMessage: PropTypes.string.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default PasswordDialog;
