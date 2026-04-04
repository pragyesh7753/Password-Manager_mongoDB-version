import React from 'react'
import { useRef, useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import 'react-toastify/dist/ReactToastify.css';

const Manager = () => {
    const ref = useRef()
    const passwordRef = useRef()
    const [form, setform] = useState({ site: "", username: "", password: "" })
    const [passwordArray, setPasswordArray] = useState([])

    const getPasswords = async () => {
        let req = await fetch("http://localhost:3000/")
        let passwords = await req.json()
        setPasswordArray(passwords)
    }


    useEffect(() => {
        getPasswords()
    }, [])


    const copyText = (text) => {
        toast('Copied to clipboard!', {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
        });
        navigator.clipboard.writeText(text)
    }

    const showPassword = () => {
        passwordRef.current.type = "text"
        console.log(ref.current.src)
        if (ref.current.src.includes("icons/eyecross.png")) {
            ref.current.src = "icons/eye.png"
            passwordRef.current.type = "password"
        }
        else {
            passwordRef.current.type = "text"
            ref.current.src = "icons/eyecross.png"
        }

    }

    const savePassword = async () => {
        if (form.site.length > 3 && form.username.length > 3 && form.password.length > 3) {

            // Check if this is an update (has an id from editing) or a new password
            const isUpdate = !!form.id
            
            if (isUpdate) {
                // If updating, delete the old one first
                await fetch("http://localhost:3000/", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: form.id }) })
                // Send with the same id to update
                const updatedPassword = { site: form.site, username: form.username, password: form.password, id: form.id }
                await fetch("http://localhost:3000/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updatedPassword) })
            } else {
                // For new passwords, generate a new id
                const newId = uuidv4()
                const newPassword = { site: form.site, username: form.username, password: form.password, id: newId }
                await fetch("http://localhost:3000/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPassword) })
            }

            // Refresh passwords from database to ensure sync
            await getPasswords()

            // Clear the form completely (including id)
            setform({ site: "", username: "", password: "" })
            toast('Password saved!', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }
        else {
            toast('Error: Password not saved!');
        }

    }

    const deletePassword = async (id) => {
        console.log("Deleting password with id ", id)
        let c = confirm("Do you really want to delete this password?")
        if (c) {
            setPasswordArray(passwordArray.filter(item => item.id !== id))
            
            await fetch("http://localhost:3000/", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })

            toast('Password Deleted!', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true, 
                draggable: true,
                progress: undefined,
                theme: "dark",
            });
        }

    }

    const editPassword = (id) => {
        setform({ ...passwordArray.filter(i => i.id === id)[0], id: id })
        setPasswordArray(passwordArray.filter(item => item.id !== id))
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
                                <input ref={passwordRef} value={form.password} onChange={handleChange} placeholder='Enter Password' className='rounded-full border border-green-500 w-full px-4 py-1.5 text-center text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500' type="password" name="password" id="password" />
                                <span className='absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer' onClick={showPassword}>
                                    <img ref={ref} className='p-0.5' width={18} src="icons/eye.png" alt="eye" />
                                </span>
                            </div>

                        </div>
                        <button onClick={savePassword} className='flex justify-center items-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full px-8 py-1.5 w-fit font-semibold text-sm transition-colors'>
                            <lord-icon
                                src="https://cdn.lordicon.com/jgnvfzqg.json"
                                trigger="hover" >
                            </lord-icon>
                            Save Password</button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 px-3 md:px-0 pb-3">
                    <div className="passwords h-full max-w-6xl mx-auto px-4 flex flex-col min-h-0">
                        <h2 className='font-bold text-xl py-2 text-gray-800 shrink-0'>Your Passwords</h2>
                        {passwordArray.length === 0 && <div className='text-gray-600 text-sm'>No passwords to show</div>}
                        {passwordArray.length != 0 && <div className='flex-1 min-h-0 overflow-y-auto overflow-hidden rounded-lg shadow-md'>
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
                                return <tr key={index} className='border-b border-green-200 hover:bg-green-100 transition-colors'>
                                    <td className='py-3 px-4'>
                                        <div className='flex items-center justify-start gap-2'>
                                            <a href={item.site} target='_blank' className='text-green-700 hover:underline'>{item.site}</a>
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
                                            <span className='text-gray-700'>{"*".repeat(item.password.length)}</span>
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
                                        <span className='cursor-pointer mx-2 inline-block' onClick={() => { editPassword(item.id) }}>
                                            <lord-icon
                                                src="https://cdn.lordicon.com/gwlusjdu.json"
                                                trigger="hover"
                                                style={{ "width": "20px", "height": "20px" }}>
                                            </lord-icon>
                                        </span>
                                        <span className='cursor-pointer mx-2 inline-block' onClick={() => { deletePassword(item.id) }}>
                                            <lord-icon
                                                src="https://cdn.lordicon.com/skkahier.json"
                                                trigger="hover"
                                                style={{ "width": "20px", "height": "20px" }}>
                                            </lord-icon>
                                        </span>
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