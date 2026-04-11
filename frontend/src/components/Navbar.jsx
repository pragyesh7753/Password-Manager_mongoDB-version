import { useClerk, useUser } from '@clerk/clerk-react'
import { useEffect, useMemo, useRef, useState } from 'react'

const Navbar = () => {
  const { signOut } = useClerk()
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress || ''
  const menuRef = useRef(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)

  const userDisplayName = useMemo(() => {
    if (user?.fullName && user.fullName.trim()) {
      return user.fullName.trim()
    }

    const composedName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    if (composedName) {
      return composedName
    }

    if (userEmail) {
      return userEmail.split('@')[0]
    }

    return 'User'
  }, [user, userEmail])

  const userInitials = useMemo(() => {
    const parts = userDisplayName.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }, [userDisplayName])

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileMenuOpen])

  return (
    <nav className='bg-slate-800 text-white shrink-0'>
      <div className="max-w-6xl mx-auto flex justify-between items-center px-2 sm:px-3 md:px-4 h-12">
        <div className="logo font-bold text-white text-lg sm:text-xl leading-none whitespace-nowrap">
          <span className='text-green-500'> &lt;</span>

          <span>Pass</span><span className='text-green-500'>OP/&gt;</span>


        </div>
        <div className='flex items-center gap-1.5 sm:gap-2'>
          <div className='relative' ref={menuRef}>
            <button
              type='button'
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              className='flex items-center gap-2 rounded-full px-2 py-1 hover:bg-slate-700/80 transition-colors'
            >
              <span className='h-8 w-8 rounded-full bg-green-700 text-white text-xs font-bold grid place-items-center ring-1 ring-green-300/80'>
                {userInitials}
              </span>
              <span className='hidden md:flex flex-col items-start leading-tight max-w-40'>
                <span className='text-xs text-white font-semibold truncate w-full'>{userDisplayName}</span>
                <span className='text-[10px] text-green-200 truncate w-full'>{userEmail}</span>
              </span>
              <svg
                className={`hidden md:block w-4 h-4 text-green-200 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : 'rotate-0'}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {isProfileMenuOpen && (
              <div className='absolute right-0 mt-2 w-[min(90vw,14rem)] rounded-xl border border-slate-700 bg-slate-900 shadow-lg z-20 overflow-hidden'>
                <div className='px-3 py-2 border-b border-slate-700'>
                  <p className='text-sm font-semibold text-white truncate'>{userDisplayName}</p>
                  <p className='text-xs text-green-200 truncate'>{userEmail}</p>
                </div>
                <button
                  type='button'
                  onClick={() => {
                    setIsProfileMenuOpen(false)
                    signOut()
                  }}
                  className='w-full text-left px-3 py-2 text-sm text-red-200 hover:bg-red-500/10 transition-colors'
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
          <a
            href="https://github.com/pragyesh7753/Password-Manager_mongoDB-version"
            target="_blank"
            rel="noreferrer noopener"
            className='text-white bg-green-700 rounded-full flex justify-center items-center ring-white ring-1 text-sm'
          >
            <img className='invert w-6 h-6 sm:w-7 sm:h-7 p-1' src="/icons/github.svg" alt="github logo" />
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navbar