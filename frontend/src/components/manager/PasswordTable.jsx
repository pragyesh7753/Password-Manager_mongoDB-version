import PropTypes from 'prop-types';
import { MASKED_PASSWORD } from './constants';
import { formatDate, normalizeUrl } from './utils';

const PasswordTable = ({
  passwords,
  pendingPasswordId,
  deletingId,
  isSubmitting,
  onCopyPassword,
  onEditPassword,
  onDeletePassword,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200">
      <table className="w-full table-fixed text-xs md:text-sm">
        <thead className="bg-slate-800 text-white">
          <tr>
            <th className="py-3 px-3 text-left font-semibold w-[14%]">Name</th>
            <th className="py-3 px-3 text-left font-semibold w-[23%]">URL</th>
            <th className="py-3 px-3 text-left font-semibold w-[16%]">Username</th>
            <th className="py-3 px-3 text-left font-semibold w-[13%]">Password</th>
            <th className="py-3 px-3 text-left font-semibold w-[17%]">Note</th>
            <th className="py-3 px-3 text-left font-semibold w-[11%]">Updated</th>
            <th className="py-3 px-3 text-center font-semibold w-[6%]">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {passwords.map((item, index) => (
            <tr key={item.id || index} className="border-b border-slate-100 hover:bg-slate-50">
              <td className="py-3 px-3 text-slate-700 font-medium wrap-break-word align-top">{item.name}</td>
              <td className="py-3 px-3 align-top break-all">
                <a href={normalizeUrl(item.url)} target="_blank" rel="noreferrer noopener" className="text-green-700 hover:underline break-all">
                  {item.url}
                </a>
              </td>
              <td className="py-3 px-3 text-slate-700 break-all align-top">{item.username}</td>
              <td className="py-3 px-3 align-top">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 tracking-wider">{MASKED_PASSWORD}</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 w-7 h-7 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => onCopyPassword(item.id)}
                    disabled={pendingPasswordId === item.id || deletingId === item.id}
                    aria-label="Copy password"
                  >
                    <lord-icon
                      src="https://cdn.lordicon.com/iykgtsbt.json"
                      trigger="hover"
                      style={{ width: '16px', height: '16px' }}
                    />
                  </button>
                </div>
              </td>
              <td className="py-3 px-3 text-slate-600 wrap-break-word align-top">{item.note || '-'}</td>
              <td className="py-3 px-3 text-slate-500 text-[10px] md:text-xs align-top wrap-break-word">{formatDate(item.updatedAt)}</td>
              <td className="py-3 px-3 align-top">
                <div className="flex flex-col items-center justify-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 w-7 h-7 hover:bg-slate-100 disabled:opacity-50"
                    onClick={() => onEditPassword(item.id)}
                    disabled={isSubmitting || deletingId === item.id || pendingPasswordId === item.id}
                    aria-label="Edit password"
                  >
                    <lord-icon
                      src="https://cdn.lordicon.com/gwlusjdu.json"
                      trigger="hover"
                      style={{ width: '16px', height: '16px' }}
                    />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 w-7 h-7 hover:bg-red-50 disabled:opacity-50"
                    onClick={() => onDeletePassword(item.id)}
                    disabled={isSubmitting || deletingId === item.id || pendingPasswordId === item.id}
                    aria-label="Delete password"
                  >
                    <lord-icon
                      src="https://cdn.lordicon.com/skkahier.json"
                      trigger="hover"
                      style={{ width: '16px', height: '16px' }}
                    />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

PasswordTable.propTypes = {
  passwords: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      url: PropTypes.string,
      username: PropTypes.string,
      note: PropTypes.string,
      updatedAt: PropTypes.string,
    })
  ).isRequired,
  pendingPasswordId: PropTypes.string,
  deletingId: PropTypes.string,
  isSubmitting: PropTypes.bool.isRequired,
  onCopyPassword: PropTypes.func.isRequired,
  onEditPassword: PropTypes.func.isRequired,
  onDeletePassword: PropTypes.func.isRequired,
};

export default PasswordTable;
