import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiClient } from '../lib/api';
import ImportIssuesDialog from './manager/ImportIssuesDialog';
import PasswordDialog from './manager/PasswordDialog';
import PasswordTable from './manager/PasswordTable';
import VaultToolbar from './manager/VaultToolbar';
import { EMPTY_FORM, FILTER_OPTIONS, PAGE_SIZE } from './manager/constants';
import {
    downloadImportIssueRowsCsv,
    getPasswordStrength,
    getValidationMessage,
    normalizeImportRow,
    parseCsvFile,
} from './manager/utils';

const Manager = () => {
    const { getToken } = useAuth();
    const importFileInputRef = useRef(null);

    const [form, setForm] = useState(EMPTY_FORM);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    const [passwordArray, setPasswordArray] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [pendingPasswordId, setPendingPasswordId] = useState(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [showValidation, setShowValidation] = useState(false);
    const [importIssueRows, setImportIssueRows] = useState([]);
    const [isImportIssuesDialogOpen, setIsImportIssuesDialogOpen] = useState(false);
    const [isRetryingImportIssues, setIsRetryingImportIssues] = useState(false);

    const validationMessage = useMemo(() => getValidationMessage(form), [form]);
    const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

    const resetDialogState = useCallback(() => {
        setForm(EMPTY_FORM);
        setEditingId(null);
        setShowValidation(false);
        setIsPasswordVisible(false);
    }, []);

    const getPasswords = useCallback(
        async ({ cursor = null, append = false } = {}) => {
            if (append) {
                setIsLoadingMore(true);
            } else {
                setIsLoading(true);
            }

            try {
                const response = await apiClient.getPasswords(getToken, {
                    limit: PAGE_SIZE,
                    cursor,
                });

                const items = response?.items || [];
                setPasswordArray((prev) => (append ? [...prev, ...items] : items));
                setNextCursor(response?.nextCursor || null);
            } catch (error) {
                toast.error(error.message || 'Failed to fetch passwords');
            } finally {
                if (append) {
                    setIsLoadingMore(false);
                } else {
                    setIsLoading(false);
                }
            }
        },
        [getToken]
    );

    const refreshPasswords = useCallback(() => getPasswords({ cursor: null, append: false }), [getPasswords]);

    useEffect(() => {
        refreshPasswords();
    }, [refreshPasswords]);

    const copyText = (text) => {
        navigator.clipboard
            .writeText(text)
            .then(() => {
                toast('Copied to clipboard!', {
                    position: 'top-right',
                    autoClose: 2500,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: 'dark',
                });
            })
            .catch(() => {
                toast.error('Clipboard permission denied.');
            });
    };

    const openCreateDialog = useCallback(() => {
        resetDialogState();
        setIsDialogOpen(true);
    }, [resetDialogState]);

    const closeDialog = useCallback(() => {
        if (isSubmitting) {
            return;
        }

        setIsDialogOpen(false);
        resetDialogState();
    }, [isSubmitting, resetDialogState]);

    const forceCloseDialog = useCallback(() => {
        setIsDialogOpen(false);
        resetDialogState();
    }, [resetDialogState]);

    useEffect(() => {
        const handleKeyboardOpen = (event) => {
            const target = event.target;
            const tag = target?.tagName?.toLowerCase();
            const isTypingTarget =
                target?.isContentEditable ||
                tag === 'input' ||
                tag === 'textarea' ||
                tag === 'select';

            if (isTypingTarget) {
                return;
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                openCreateDialog();
            }
        };

        window.addEventListener('keydown', handleKeyboardOpen);
        return () => window.removeEventListener('keydown', handleKeyboardOpen);
    }, [openCreateDialog]);

    const filteredPasswords = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const now = Date.now();

        return passwordArray.filter((item) => {
            const textMatch = !query || [item.name, item.url, item.username, item.note]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query));

            if (!textMatch) {
                return false;
            }

            if (activeFilter === 'recent') {
                const updatedAt = new Date(item.updatedAt || item.createdAt).getTime();
                if (Number.isNaN(updatedAt)) {
                    return false;
                }

                const lastSevenDays = 7 * 24 * 60 * 60 * 1000;
                return now - updatedAt <= lastSevenDays;
            }

            if (activeFilter === 'with-notes') {
                return !!String(item.note || '').trim();
            }

            return true;
        });
    }, [passwordArray, searchQuery, activeFilter]);

    const savePassword = async () => {
        if (validationMessage) {
            setShowValidation(true);
            toast.error(validationMessage);
            return;
        }

        setIsSubmitting(true);

        try {
            const isUpdate = !!editingId;
            const payload = {
                url: form.url.trim(),
                username: form.username.trim(),
                password: form.password,
                note: form.note.trim(),
            };

            if (isUpdate) {
                await apiClient.updatePassword(editingId, payload, getToken);
            } else {
                await apiClient.createPassword(payload, getToken);
            }

            await refreshPasswords();
            forceCloseDialog();

            toast(isUpdate ? 'Password updated!' : 'Password saved!', {
                position: 'top-right',
                autoClose: 2500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: 'dark',
            });
        } catch (error) {
            toast.error(error.message || 'Error: Password not saved!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deletePassword = async (id) => {
        if (!window.confirm('Do you really want to delete this password?')) {
            return;
        }

        setDeletingId(id);
        try {
            await apiClient.deletePassword(id, getToken);
            await refreshPasswords();
            toast('Password Deleted!', {
                position: 'top-right',
                autoClose: 2500,
                hideProgressBar: false,
                closeOnClick: true,
                draggable: true,
                progress: undefined,
                theme: 'dark',
            });
        } catch (error) {
            toast.error(error.message || 'Failed to delete password');
        } finally {
            setDeletingId(null);
        }
    };

    const copyPassword = async (id) => {
        setPendingPasswordId(id);

        try {
            const password = await apiClient.revealPassword(id, getToken);
            copyText(password);
        } catch (error) {
            toast.error(error.message || 'Failed to copy password');
        } finally {
            setPendingPasswordId(null);
        }
    };

    const editPassword = async (id) => {
        const selected = passwordArray.find((item) => item.id === id);
        if (!selected) {
            return;
        }

        setPendingPasswordId(id);
        try {
            const password = await apiClient.revealPassword(id, getToken);
            setEditingId(id);
            setForm({
                url: selected.url || '',
                username: selected.username || '',
                password,
                note: selected.note || '',
            });
            setShowValidation(false);
            setIsPasswordVisible(false);
            setIsDialogOpen(true);
        } catch (error) {
            toast.error(error.message || 'Failed to load password for editing');
        } finally {
            setPendingPasswordId(null);
        }
    };

    const loadMore = () => {
        if (!nextCursor || isLoadingMore) {
            return;
        }

        getPasswords({ cursor: nextCursor, append: true });
    };

    const exportPasswordsCsv = async () => {
        setIsExporting(true);

        try {
            const { csv, fileName } = await apiClient.exportPasswordsCsv(getToken);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.setAttribute('download', fileName || 'passop-passwords.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);

            toast.success('Passwords exported as CSV');
        } catch (error) {
            toast.error(error.message || 'Failed to export passwords');
        } finally {
            setIsExporting(false);
        }
    };

    const openImportPicker = () => {
        if (isImporting) {
            return;
        }

        importFileInputRef.current?.click();
    };

    const handleManualRefresh = () => {
        if (isLoading || isImporting || isExporting) {
            return;
        }

        refreshPasswords();
    };

    const handleImportFileSelected = async (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setIsImporting(true);

        try {
            const rows = await parseCsvFile(file);

            if (!rows.length) {
                throw new Error('CSV file is empty');
            }

            const normalizedRows = rows.map((row, index) => normalizeImportRow(row, index));
            const entries = normalizedRows.filter((row) => row.entry).map((row) => row.entry);
            const skippedRows = normalizedRows
                .filter((row) => row.error)
                .map((row) => ({
                    rowNumber: row.error.rowNumber,
                    missingFields: row.error.missingFields,
                    message: row.error.message,
                    draft: {
                        url: row.draft?.url || '',
                        username: row.draft?.username || '',
                        password: row.draft?.password || '',
                        note: row.draft?.note || '',
                    },
                }));

            if (!entries.length) {
                if (skippedRows.length) {
                    setImportIssueRows(skippedRows);
                    setIsImportIssuesDialogOpen(true);
                    toast.error('No rows were imported. Fix skipped rows in the dialog and retry.');
                    return;
                }

                throw new Error('No valid rows found in CSV');
            }

            const result = await apiClient.importPasswords(entries, getToken);
            await refreshPasswords();

            toast.success(`Import complete: ${result.inserted || 0} inserted`);
            if (skippedRows.length) {
                setImportIssueRows(skippedRows);
                setIsImportIssuesDialogOpen(true);
                toast.warn(`${skippedRows.length} row(s) were not imported. Review and fix them in the dialog.`);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to import CSV');
        } finally {
            setIsImporting(false);
            event.target.value = '';
        }
    };

    const handleChange = (event) => {
        setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    };

    const getMissingFieldsForDraft = (draft) => {
        const missingFields = [];
        if (!String(draft.url || '').trim()) missingFields.push('url');
        if (!String(draft.username || '').trim()) missingFields.push('username');
        if (!String(draft.password || '').trim()) missingFields.push('password');
        return missingFields;
    };

    const handleImportIssueFieldChange = (rowIndex, field, value) => {
        setImportIssueRows((prev) =>
            prev.map((row, index) => {
                if (index !== rowIndex) {
                    return row;
                }

                const nextDraft = { ...row.draft, [field]: value };
                const nextMissing = getMissingFieldsForDraft(nextDraft);

                return {
                    ...row,
                    draft: nextDraft,
                    missingFields: nextMissing,
                    message: nextMissing.length
                        ? `Row ${row.rowNumber} skipped: missing ${nextMissing.join(', ')}`
                        : `Row ${row.rowNumber} is ready to import`,
                };
            })
        );
    };

    const retryImportIssueRows = async () => {
        if (!importIssueRows.length) {
            return;
        }

        setIsRetryingImportIssues(true);

        try {
            const rowsWithStatus = importIssueRows.map((row) => {
                const draft = {
                    url: String(row.draft.url || '').trim(),
                    username: String(row.draft.username || '').trim(),
                    password: String(row.draft.password || ''),
                    note: String(row.draft.note || '').trim(),
                };
                const missingFields = getMissingFieldsForDraft(draft);
                return { ...row, draft, missingFields };
            });

            const validEntries = rowsWithStatus
                .filter((row) => row.missingFields.length === 0)
                .map((row) => row.draft);

            const stillInvalidRows = rowsWithStatus
                .filter((row) => row.missingFields.length > 0)
                .map((row) => ({
                    ...row,
                    message: `Row ${row.rowNumber} still missing ${row.missingFields.join(', ')}`,
                }));

            if (!validEntries.length) {
                setImportIssueRows(stillInvalidRows);
                toast.error('No fixed rows ready to import. Fill required fields first.');
                return;
            }

            const result = await apiClient.importPasswords(validEntries, getToken);
            await refreshPasswords();
            toast.success(`Fixed import complete: ${result.inserted || 0} inserted`);

            if (stillInvalidRows.length) {
                setImportIssueRows(stillInvalidRows);
                toast.warn(`${stillInvalidRows.length} row(s) still need fixes.`);
            } else {
                setImportIssueRows([]);
                setIsImportIssuesDialogOpen(false);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to import fixed rows');
        } finally {
            setIsRetryingImportIssues(false);
        }
    };

    const closeImportIssuesDialog = () => {
        if (isRetryingImportIssues) {
            return;
        }

        setIsImportIssuesDialogOpen(false);
    };

    const downloadImportIssueRows = () => {
        if (!importIssueRows.length) {
            toast.error('No skipped rows available for download.');
            return;
        }

        try {
            downloadImportIssueRowsCsv(importIssueRows);
            toast.success('Skipped rows CSV downloaded. Fix and re-import when ready.');
        } catch (error) {
            toast.error(error.message || 'Failed to download skipped rows CSV');
        }
    };

    return (
        <>
            <ToastContainer />
            <div className="h-full bg-[linear-gradient(120deg,#f7faf9_0%,#edf7f3_40%,#f3f8f7_100%)] overflow-hidden">
                <div className="h-full max-w-6xl mx-auto px-4 py-4 md:py-6 flex flex-col">
                    <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleImportFileSelected}
                    />

                    <section className="flex-1 min-h-0 rounded-3xl border border-green-100 bg-white/95 shadow-[0_16px_36px_-24px_rgba(15,23,42,0.45)] flex flex-col">
                        <VaultToolbar
                            isImporting={isImporting}
                            isExporting={isExporting}
                            isLoading={isLoading}
                            isRefreshing={isLoading && passwordArray.length > 0}
                            onOpenImport={openImportPicker}
                            onExport={exportPasswordsCsv}
                            onRefresh={handleManualRefresh}
                            onAdd={openCreateDialog}
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            activeFilter={activeFilter}
                            onFilterChange={setActiveFilter}
                            filterOptions={FILTER_OPTIONS}
                            filteredCount={filteredPasswords.length}
                            totalCount={passwordArray.length}
                        />

                        <div className="px-5 pb-4 md:px-7 flex-1 min-h-0 flex flex-col">
                            {isLoading && <div className="text-sm text-slate-500">Loading passwords...</div>}

                            {!isLoading && passwordArray.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500 text-sm">
                                    No passwords yet. Click Add Password to create your first credential.
                                </div>
                            )}

                            {!isLoading && passwordArray.length > 0 && filteredPasswords.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-slate-500 text-sm">
                                    No results match your current search or filter.
                                </div>
                            )}

                            {filteredPasswords.length > 0 && (
                                <PasswordTable
                                    passwords={filteredPasswords}
                                    pendingPasswordId={pendingPasswordId}
                                    deletingId={deletingId}
                                    isSubmitting={isSubmitting}
                                    onCopyPassword={copyPassword}
                                    onEditPassword={editPassword}
                                    onDeletePassword={deletePassword}
                                />
                            )}

                            {!isLoading && !!nextCursor && (
                                <div className="pt-4 flex justify-center shrink-0">
                                    <button
                                        type="button"
                                        onClick={loadMore}
                                        disabled={isLoadingMore}
                                        className="rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-500 disabled:cursor-not-allowed text-white px-4 py-2 text-sm font-semibold transition-colors"
                                    >
                                        {isLoadingMore ? 'Loading...' : 'Load more'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <PasswordDialog
                isOpen={isDialogOpen}
                editingId={editingId}
                form={form}
                onChange={handleChange}
                isPasswordVisible={isPasswordVisible}
                onTogglePasswordVisibility={() => setIsPasswordVisible((prev) => !prev)}
                passwordStrength={passwordStrength}
                showValidation={showValidation}
                validationMessage={validationMessage}
                isSubmitting={isSubmitting}
                onClose={closeDialog}
                onSubmit={savePassword}
            />

            <ImportIssuesDialog
                isOpen={isImportIssuesDialogOpen}
                rows={importIssueRows}
                onClose={closeImportIssuesDialog}
                onFieldChange={handleImportIssueFieldChange}
                onRetryImport={retryImportIssueRows}
                onDownloadRows={downloadImportIssueRows}
                isRetrying={isRetryingImportIssues}
            />
        </>
    );
};

export default Manager;