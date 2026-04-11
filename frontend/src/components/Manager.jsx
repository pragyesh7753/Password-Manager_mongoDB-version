import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import Papa from 'papaparse';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiClient } from '../lib/api';

const EMPTY_FORM = { url: '', username: '', password: '', note: '' };
const PAGE_SIZE = 50;
const MASKED_PASSWORD = '********';

const parseCsvFile = (file) =>
    new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (header) =>
                String(header || '')
                    .replace(/^\uFEFF/, '')
                    .trim()
                    .toLowerCase(),
            complete: (results) => resolve(results.data || []),
            error: (error) => reject(error),
        })
    })

const normalizeCsvObject = (row) =>
    Object.fromEntries(
        Object.entries(row || {}).map(([key, value]) => [
            String(key || '')
                .replace(/^\uFEFF/, '')
                .trim()
                .toLowerCase(),
            typeof value === 'string' ? value.trim() : value,
        ])
    )

const expandCollapsedCsvRow = (normalized) => {
    const keys = Object.keys(normalized)

    if (keys.length !== 1) {
        return normalized
    }

    const collapsedHeader = keys[0]
    const collapsedValue = String(normalized[collapsedHeader] || '')
    const delimiter = collapsedHeader.includes(';') ? ';' : collapsedHeader.includes('\t') ? '\t' : collapsedHeader.includes(',') ? ',' : null

    if (!delimiter) {
        return normalized
    }

    const reparsed = Papa.parse(`${collapsedHeader}\n${collapsedValue}`, {
        header: true,
        delimiter,
        skipEmptyLines: 'greedy',
        transformHeader: (header) =>
            String(header || '')
                .replace(/^\uFEFF/, '')
                .trim()
                .toLowerCase(),
    })

    return normalizeCsvObject(reparsed.data?.[0] || normalized)
}

const pickFirstNonEmpty = (source, keys) => {
    for (const key of keys) {
        const value = source[key]
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim()
        }
    }

    return ''
}

const normalizeImportRow = (row, index) => {
    const normalized = expandCollapsedCsvRow(normalizeCsvObject(row))

    const url = pickFirstNonEmpty(normalized, ['url', 'website', 'origin', 'login_url'])
    const username = pickFirstNonEmpty(normalized, ['username', 'user', 'username_value', 'usernamevalue'])
    const password = pickFirstNonEmpty(normalized, ['password', 'password_value', 'passwordvalue'])
    const note = pickFirstNonEmpty(normalized, ['note', 'notes', 'comment', 'comments'])

    if (!url || !username || !password) {
        return {
            entry: null,
            error: `Row ${index + 2} skipped: missing required fields (url, username, password)`
        }
    }

    return {
        entry: {
            url,
            username,
            password,
            note,
        },
        error: null,
    }
}

const normalizeUrl = (value) => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '#';
    }

    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        return new URL(url).toString();
    } catch {
        return '#';
    }
};

const getValidationMessage = (form) => {
    if (form.url.trim().length < 4) return 'Website URL must be at least 4 characters.';
    if (form.username.trim().length < 4) return 'Username must be at least 4 characters.';
    if (form.password.length < 4) return 'Password must be at least 4 characters.';
    return '';
};

const Manager = () => {
    const { getToken } = useAuth()
    const importFileInputRef = useRef(null)
    const [form, setform] = useState(EMPTY_FORM)
    const [passwordArray, setPasswordArray] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [nextCursor, setNextCursor] = useState(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [pendingPasswordId, setPendingPasswordId] = useState(null)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [showValidation, setShowValidation] = useState(false)

    const validationMessage = useMemo(() => getValidationMessage(form), [form])

    const getPasswords = useCallback(async ({ cursor = null, append = false } = {}) => {
        if (append) {
            setIsLoadingMore(true)
        } else {
            setIsLoading(true)
        }

        try {
            const response = await apiClient.getPasswords(getToken, {
                limit: PAGE_SIZE,
                cursor,
            })

            const items = response?.items || []
            setPasswordArray((prev) => (append ? [...prev, ...items] : items))
            setNextCursor(response?.nextCursor || null)
        } catch (error) {
            toast.error(error.message || 'Failed to fetch passwords')
        } finally {
            if (append) {
                setIsLoadingMore(false)
            } else {
                setIsLoading(false)
            }
        }
    }, [getToken])

    const refreshPasswords = useCallback(() => getPasswords({ cursor: null, append: false }), [getPasswords])


    useEffect(() => {
        refreshPasswords()
    }, [refreshPasswords])


    const copyText = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                toast('Copied to clipboard!', {
                    position: "top-right",
                    autoClose: 2500,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark",
                });
            })
            .catch(() => {
                toast.error('Clipboard permission denied.')
            })
    }

    const showPassword = () => {
        setIsPasswordVisible((prev) => !prev)
    }

    const savePassword = async () => {
        if (validationMessage) {
            setShowValidation(true)
            toast.error(validationMessage)
            return
        }

        setIsSubmitting(true)

        try {
            const isUpdate = !!form.id
            const payload = {
                url: form.url.trim(),
                username: form.username.trim(),
                password: form.password,
                note: form.note.trim(),
            }

            if (isUpdate) {
                await apiClient.updatePassword(form.id, payload, getToken)
            } else {
                await apiClient.createPassword(payload, getToken)
            }

            await refreshPasswords()
            setform(EMPTY_FORM)
            setIsPasswordVisible(false)
            setShowValidation(false)

            toast(isUpdate ? 'Password updated!' : 'Password saved!', {
                position: "top-right",
                autoClose: 2500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        } catch (error) {
            toast.error(error.message || 'Error: Password not saved!')
        } finally {
            setIsSubmitting(false)
        }

    }

    const deletePassword = async (id) => {
        let c = window.confirm("Do you really want to delete this password?")
        if (c) {
            setDeletingId(id)
            try {
                await apiClient.deletePassword(id, getToken)

                await refreshPasswords()
                toast('Password Deleted!', {
                    position: "top-right",
                    autoClose: 2500,
                    hideProgressBar: false,
                    closeOnClick: true,
                    draggable: true,
                    progress: undefined,
                    theme: "dark",
                });
            } catch (error) {
                toast.error(error.message || 'Failed to delete password')
            } finally {
                setDeletingId(null)
            }
        }

    }

    const copyPassword = async (id) => {
        setPendingPasswordId(id)

        try {
            const password = await apiClient.revealPassword(id, getToken)
            copyText(password)
        } catch (error) {
            toast.error(error.message || 'Failed to copy password')
        } finally {
            setPendingPasswordId(null)
        }
    }

    const editPassword = async (id) => {
        const selected = passwordArray.find((item) => item.id === id)
        if (!selected) {
            return
        }

        setPendingPasswordId(id)

        try {
            const password = await apiClient.revealPassword(id, getToken)
            setform({
                url: selected.url || '',
                username: selected.username || '',
                password,
                note: selected.note || '',
                id,
            })
            setIsPasswordVisible(false)
        } catch (error) {
            toast.error(error.message || 'Failed to load password for editing')
        } finally {
            setPendingPasswordId(null)
        }
    }

    const loadMore = () => {
        if (!nextCursor || isLoadingMore) {
            return
        }

        getPasswords({ cursor: nextCursor, append: true })
    }

    const exportPasswordsCsv = async () => {
        setIsExporting(true)

        try {
            const { csv, fileName } = await apiClient.exportPasswordsCsv(getToken)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', fileName || 'passop-passwords.csv')
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success('Passwords exported as CSV')
        } catch (error) {
            toast.error(error.message || 'Failed to export passwords')
        } finally {
            setIsExporting(false)
        }
    }

    const openImportPicker = () => {
        if (isImporting) {
            return
        }

        importFileInputRef.current?.click()
    }

    const handleImportFileSelected = async (event) => {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        setIsImporting(true)

        try {
            const rows = await parseCsvFile(file)

            if (!rows.length) {
                throw new Error('CSV file is empty')
            }

            const normalizedRows = rows.map((row, index) => normalizeImportRow(row, index))
            const entries = normalizedRows.filter((row) => row.entry).map((row) => row.entry)
            const skippedRows = normalizedRows.filter((row) => row.error)

            if (!entries.length) {
                throw new Error(skippedRows[0]?.error || 'No valid rows found in CSV')
            }

            const result = await apiClient.importPasswords(entries, getToken)

            await refreshPasswords()

            toast.success(`Import complete: ${result.inserted || 0} inserted`)
            if (skippedRows.length) {
                toast.warn(`${skippedRows.length} row(s) skipped due to missing required fields`) 
            }
        } catch (error) {
            toast.error(error.message || 'Failed to import CSV')
        } finally {
            setIsImporting(false)
            event.target.value = ''
        }
    }


    const handleChange = (e) => {
        setform({ ...form, [e.target.name]: e.target.value })
    }


    return (
        <>
            <ToastContainer />
            <div className="h-full flex flex-col bg-green-50 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[14px_24px] overflow-hidden">
                <div className="shrink-0 px-3 md:px-0 py-3">
                    <h1 className='text-4xl font-bold text-center mb-1 tracking-tight'>
                        <span className='text-green-500'> &lt;</span>

                        <span>Pass</span><span className='text-green-500'>OP/&gt;</span>

                    </h1>
                    <p className='text-green-700 text-sm text-center mb-3 font-medium'>Your own Password Manager</p>

                    <div className="flex flex-col text-black gap-4 items-center max-w-2xl mx-auto px-4">
                        <input
                            ref={importFileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={handleImportFileSelected}
                        />
                        <input value={form.url} onChange={handleChange} placeholder='Enter website URL' className='rounded-full border border-green-500 w-full px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="text" name="url" id="url" />
                        <div className="flex flex-col md:flex-row w-full justify-center gap-4">
                            <input value={form.username} onChange={handleChange} placeholder='Enter Username' className='rounded-full border border-green-500 flex-1 px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="text" name="username" id="username" />
                            <div className="relative flex-1">
                                <input value={form.password} onChange={handleChange} placeholder='Enter Password' className='rounded-full border border-green-500 w-full px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type={isPasswordVisible ? "text" : "password"} name="password" id="password" />
                                <span className='absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer' onClick={showPassword}>
                                    <img className='p-0.5' width={18} src={isPasswordVisible ? "/icons/eyecross.png" : "/icons/eye.png"} alt="toggle password visibility" />
                                </span>
                            </div>

                        </div>
                        <input value={form.note} onChange={handleChange} placeholder='Add note (optional)' className='rounded-2xl border border-green-500 w-full px-4 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="text" name="note" id="note" />
                        <button
                            onClick={savePassword}
                            disabled={isSubmitting}
                            className='flex justify-center items-center gap-2 bg-green-700 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white rounded-full px-8 py-1.5 w-fit font-semibold text-sm transition-colors'
                        >
                            <lord-icon
                                src="https://cdn.lordicon.com/jgnvfzqg.json"
                                trigger="hover" >
                            </lord-icon>
                            {isSubmitting ? 'Saving...' : 'Save Password'}
                        </button>
                        <div className='flex flex-wrap justify-center gap-2'>
                            <button
                                type='button'
                                onClick={exportPasswordsCsv}
                                disabled={isExporting || isImporting || isLoading}
                                className='bg-slate-700 hover:bg-slate-600 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-full px-5 py-1.5 font-semibold text-sm transition-colors'
                            >
                                {isExporting ? 'Exporting...' : 'Export CSV'}
                            </button>
                            <button
                                type='button'
                                onClick={openImportPicker}
                                disabled={isImporting || isExporting || isSubmitting}
                                className='bg-green-800 hover:bg-green-700 disabled:bg-green-500 disabled:cursor-not-allowed text-white rounded-full px-5 py-1.5 font-semibold text-sm transition-colors'
                            >
                                {isImporting ? 'Importing...' : 'Import CSV'}
                            </button>
                        </div>
                        {showValidation && validationMessage && <p className='text-xs text-red-600'>{validationMessage}</p>}
                    </div>
                </div>

                <div className="flex-1 min-h-0 px-3 md:px-0 pb-3">
                    <div className="passwords h-full max-w-6xl mx-auto px-4 flex flex-col min-h-0">
                        <h2 className='font-bold text-xl py-2 text-gray-800 shrink-0'>Your Passwords</h2>
                        {isLoading && <div className='text-gray-600 text-sm'>Loading passwords...</div>}
                        {!isLoading && passwordArray.length === 0 && <div className='text-gray-600 text-sm'>No passwords to show</div>}
                        {passwordArray.length != 0 && <div className='flex-1 min-h-0 overflow-y-auto rounded-lg shadow-md'>
                        <table className="table-auto w-full">
                        <thead className='bg-green-700 text-white'>
                            <tr>
                                <th className='py-3 px-4 text-left font-semibold'>Name</th>
                                <th className='py-3 px-4 text-left font-semibold'>URL</th>
                                <th className='py-3 px-4 text-left font-semibold'>Username</th>
                                <th className='py-3 px-4 text-left font-semibold'>Password</th>
                                <th className='py-3 px-4 text-left font-semibold'>Note</th>
                                <th className='py-3 px-4 text-center font-semibold'>Actions</th>
                            </tr>
                        </thead>
                        <tbody className='bg-green-50'>
                            {passwordArray.map((item, index) => {
                                return <tr key={item.id || index} className='border-b border-green-200 hover:bg-green-100 transition-colors'>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <span className='text-gray-700'>{item.name}</span>
                                            <div className='lordiconcopy size-5 cursor-pointer shrink-0' onClick={() => { copyText(item.name) }}>
                                                <lord-icon
                                                    style={{ "width": "20px", "height": "20px" }}
                                                    src="https://cdn.lordicon.com/iykgtsbt.json"
                                                    trigger="hover" >
                                                </lord-icon>
                                            </div>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <a href={normalizeUrl(item.url)} target='_blank' rel='noreferrer noopener' className='text-green-700 hover:underline'>{item.url}</a>
                                            <div className='lordiconcopy size-5 cursor-pointer shrink-0' onClick={() => { copyText(item.url) }}>
                                                <lord-icon
                                                    style={{ "width": "20px", "height": "20px" }}
                                                    src="https://cdn.lordicon.com/iykgtsbt.json"
                                                    trigger="hover" >
                                                </lord-icon>
                                            </div>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <span className='text-gray-700'>{item.username}</span>
                                            <div className='lordiconcopy size-5 cursor-pointer shrink-0' onClick={() => { copyText(item.username) }}>
                                                <lord-icon
                                                    style={{ "width": "20px", "height": "20px" }}
                                                    src="https://cdn.lordicon.com/iykgtsbt.json"
                                                    trigger="hover" >
                                                </lord-icon>
                                            </div>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <span className='text-gray-700'>{MASKED_PASSWORD}</span>
                                            <button
                                                type='button'
                                                className='lordiconcopy size-5 cursor-pointer shrink-0 disabled:opacity-50'
                                                onClick={() => { copyPassword(item.id) }}
                                                disabled={pendingPasswordId === item.id || isSubmitting || deletingId === item.id}
                                            >
                                                <lord-icon
                                                    style={{ "width": "20px", "height": "20px" }}
                                                    src="https://cdn.lordicon.com/iykgtsbt.json"
                                                    trigger="hover" >
                                                </lord-icon>
                                            </button>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4'>
                                        <span className='text-gray-700 wrap-break-word'>{item.note || '-'}</span>
                                    </td>
                                    <td className='py-3 px-4 text-center'>
                                        <button className='cursor-pointer mx-2 inline-block disabled:opacity-50' onClick={() => { editPassword(item.id) }} disabled={isSubmitting || deletingId === item.id || pendingPasswordId === item.id}>
                                            <lord-icon
                                                src="https://cdn.lordicon.com/gwlusjdu.json"
                                                trigger="hover"
                                                style={{ "width": "20px", "height": "20px" }}>
                                            </lord-icon>
                                        </button>
                                        <button className='cursor-pointer mx-2 inline-block disabled:opacity-50' onClick={() => { deletePassword(item.id) }} disabled={isSubmitting || deletingId === item.id || pendingPasswordId === item.id}>
                                            <lord-icon
                                                src="https://cdn.lordicon.com/skkahier.json"
                                                trigger="hover"
                                                style={{ "width": "20px", "height": "20px" }}>
                                            </lord-icon>
                                        </button>
                                    </td>
                                </tr>
                            })}
                        </tbody>
                    </table></div>}
                        {!isLoading && !!nextCursor && (
                            <div className='py-3 flex justify-center'>
                                <button
                                    type='button'
                                    onClick={loadMore}
                                    disabled={isLoadingMore}
                                    className='rounded-full bg-green-700 hover:bg-green-600 disabled:bg-green-400 disabled:cursor-not-allowed text-white px-5 py-1.5 text-sm font-semibold transition-colors'
                                >
                                    {isLoadingMore ? 'Loading...' : 'Load more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    )
}

export default Manager