import { useCallback, useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { apiClient } from '../lib/api';

const EMPTY_FORM = { site: '', username: '', password: '' };

const normalizeSiteUrl = (value) => {
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
    if (form.site.trim().length < 4) return 'Website URL must be at least 4 characters.';
    if (form.username.trim().length < 4) return 'Username must be at least 4 characters.';
    if (form.password.length < 4) return 'Password must be at least 4 characters.';
    return '';
};

const Manager = () => {
    const [form, setform] = useState(EMPTY_FORM)
    const [passwordArray, setPasswordArray] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [showValidation, setShowValidation] = useState(false)

    const validationMessage = useMemo(() => getValidationMessage(form), [form])

    const getPasswords = useCallback(async () => {
        setIsLoading(true)
        try {
            const passwords = await apiClient.getPasswords()
            setPasswordArray(passwords)
        } catch (error) {
            toast.error(error.message || 'Failed to fetch passwords')
        } finally {
            setIsLoading(false)
        }
    }, [])


    useEffect(() => {
        getPasswords()
    }, [getPasswords])


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
                site: form.site.trim(),
                username: form.username.trim(),
                password: form.password,
            }

            if (isUpdate) {
                await apiClient.updatePassword(form.id, payload)
            } else {
                await apiClient.createPassword(payload)
            }

            await getPasswords()
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
                await apiClient.deletePassword(id)

                await getPasswords()
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

    const editPassword = (id) => {
        const selected = passwordArray.find((item) => item.id === id)
        if (selected) {
            setform({ site: selected.site, username: selected.username, password: selected.password, id })
            setIsPasswordVisible(false)
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
                        <input value={form.site} onChange={handleChange} placeholder='Enter website URL' className='rounded-full border border-green-500 w-full px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="text" name="site" id="site" />
                        <div className="flex flex-col md:flex-row w-full justify-center gap-4">
                            <input value={form.username} onChange={handleChange} placeholder='Enter Username' className='rounded-full border border-green-500 flex-1 px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="text" name="username" id="username" />
                            <div className="relative flex-1">
                                <input value={form.password} onChange={handleChange} placeholder='Enter Password' className='rounded-full border border-green-500 w-full px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type={isPasswordVisible ? "text" : "password"} name="password" id="password" />
                                <span className='absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer' onClick={showPassword}>
                                    <img className='p-0.5' width={18} src={isPasswordVisible ? "/icons/eyecross.png" : "/icons/eye.png"} alt="toggle password visibility" />
                                </span>
                            </div>

                        </div>
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
                                <th className='py-3 px-4 text-left font-semibold'>Site</th>
                                <th className='py-3 px-4 text-left font-semibold'>Username</th>
                                <th className='py-3 px-4 text-left font-semibold'>Password</th>
                                <th className='py-3 px-4 text-center font-semibold'>Actions</th>
                            </tr>
                        </thead>
                        <tbody className='bg-green-50'>
                            {passwordArray.map((item, index) => {
                                return <tr key={item.id || index} className='border-b border-green-200 hover:bg-green-100 transition-colors'>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <a href={normalizeSiteUrl(item.site)} target='_blank' rel='noreferrer noopener' className='text-green-700 hover:underline'>{item.site}</a>
                                            <div className='lordiconcopy size-5 cursor-pointer shrink-0' onClick={() => { copyText(item.site) }}>
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
                                            <span className='text-gray-700'>{"*".repeat(item.password?.length || 0)}</span>
                                            <div className='lordiconcopy size-5 cursor-pointer shrink-0' onClick={() => { copyText(item.password) }}>
                                                <lord-icon
                                                    style={{ "width": "20px", "height": "20px" }}
                                                    src="https://cdn.lordicon.com/iykgtsbt.json"
                                                    trigger="hover" >
                                                </lord-icon>
                                            </div>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4 text-center'>
                                        <button className='cursor-pointer mx-2 inline-block disabled:opacity-50' onClick={() => { editPassword(item.id) }} disabled={isSubmitting || deletingId === item.id}>
                                            <lord-icon
                                                src="https://cdn.lordicon.com/gwlusjdu.json"
                                                trigger="hover"
                                                style={{ "width": "20px", "height": "20px" }}>
                                            </lord-icon>
                                        </button>
                                        <button className='cursor-pointer mx-2 inline-block disabled:opacity-50' onClick={() => { deletePassword(item.id) }} disabled={isSubmitting || deletingId === item.id}>
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
                    </div>
                </div>
            </div>

        </>
    )
}

export default Manager