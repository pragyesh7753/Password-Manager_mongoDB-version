import PropTypes from 'prop-types';

const VaultToolbar = ({
  isImporting,
  isExporting,
  isLoading,
  isRefreshing,
  onOpenImport,
  onExport,
  onRefresh,
  onAdd,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  filterOptions,
  filteredCount,
  totalCount,
}) => {
  return (
    <>
      <div className="px-5 py-5 md:px-7 border-b border-green-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Password Vault</h1>
          <p className="text-sm text-slate-500 mt-1">Manage credentials with secure copy and controlled reveal.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            disabled={isImporting || isExporting}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-slate-700 transition-colors"
          >
            {isImporting ? 'Importing...' : 'Import CSV'}
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting || isImporting || isLoading}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-slate-700 transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing || isImporting || isExporting}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-slate-700 transition-colors"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={onAdd}
            className="rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Add Password
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 md:px-7 shrink-0">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between pb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name, URL, username, or note"
            className="w-full md:max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onFilterChange(option.id)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeFilter === option.id
                    ? 'border-green-700 bg-green-700 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 pb-3">Showing {filteredCount} of {totalCount} entries</p>
      </div>
    </>
  );
};

VaultToolbar.propTypes = {
  isImporting: PropTypes.bool.isRequired,
  isExporting: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
  onOpenImport: PropTypes.func.isRequired,
  onExport: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  activeFilter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  filterOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  filteredCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
};

export default VaultToolbar;
