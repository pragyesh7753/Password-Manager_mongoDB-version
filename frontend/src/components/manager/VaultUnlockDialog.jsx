import PropTypes from 'prop-types';

const VaultUnlockDialog = ({
  isOpen,
  masterPassword,
  confirmMasterPassword,
  onMasterPasswordChange,
  onConfirmMasterPasswordChange,
  onUnlock,
  isUnlocking,
  unlockError,
  isCreatingMasterPassword,
  isVaultStateHydrating,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl">
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-800">Unlock Your Vault</h3>
          <p className="text-sm text-slate-500 mt-1">
            Enter your master password. It is used only in your browser to decrypt saved passwords.
          </p>
          {isVaultStateHydrating && (
            <p className="mt-3 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Checking your existing vault data before unlocking.
            </p>
          )}
          {isCreatingMasterPassword && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Important: if you forget this master password, your encrypted passwords cannot be recovered.
            </p>
          )}
        </div>

        <form
          className="px-4 sm:px-6 py-4 sm:py-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onUnlock();
          }}
        >
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Master password</span>
            <input
              type="password"
              autoFocus
              value={masterPassword}
              onChange={(event) => onMasterPasswordChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter master password"
            />
          </label>

          {isCreatingMasterPassword && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Confirm master password</span>
              <input
                type="password"
                value={confirmMasterPassword}
                onChange={(event) => onConfirmMasterPasswordChange(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Re-enter master password"
              />
            </label>
          )}

          {unlockError && <p className="text-xs text-red-600">{unlockError}</p>}

          <button
            type="submit"
            disabled={
              isVaultStateHydrating ||
              isUnlocking ||
              !masterPassword.trim() ||
              (isCreatingMasterPassword && !confirmMasterPassword.trim())
            }
            className="w-full rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {isVaultStateHydrating
              ? 'Checking Vault...'
              : isUnlocking
                ? 'Unlocking...'
                : isCreatingMasterPassword
                  ? 'Create & Unlock Vault'
                  : 'Unlock Vault'}
          </button>
        </form>
      </div>
    </div>
  );
};

VaultUnlockDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  masterPassword: PropTypes.string.isRequired,
  confirmMasterPassword: PropTypes.string.isRequired,
  onMasterPasswordChange: PropTypes.func.isRequired,
  onConfirmMasterPasswordChange: PropTypes.func.isRequired,
  onUnlock: PropTypes.func.isRequired,
  isUnlocking: PropTypes.bool.isRequired,
  unlockError: PropTypes.string.isRequired,
  isCreatingMasterPassword: PropTypes.bool.isRequired,
  isVaultStateHydrating: PropTypes.bool.isRequired,
};

export default VaultUnlockDialog;
