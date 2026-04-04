const Navbar = () => {
  return (
    <nav className='bg-slate-800 text-white shrink-0'>
      <div className="max-w-6xl mx-auto flex justify-between items-center px-3 md:px-4 h-12">

        <div className="logo font-bold text-white text-xl leading-none">
          <span className='text-green-500'> &lt;</span>

          <span>Pass</span><span className='text-green-500'>OP/&gt;</span>


        </div>
        {/* <ul>
                    <li className='flex gap-4 '>
                        <a className='hover:font-bold' href='/'>Home</a>
                        <a className='hover:font-bold' href='#'>About</a>
                        <a className='hover:font-bold' href='#'>Contact</a>
                    </li>
                </ul> */}
        <a
          href="https://github.com/pragyesh7753/Password-Manager_mongoDB-version"
          target="_blank"
          rel="noreferrer noopener"
          className='text-white bg-green-700 rounded-full flex justify-between items-center ring-white ring-1 text-sm'
        >
          <img className='invert w-7 p-1' src="/icons/github.svg" alt="github logo" />
          <span className='font-bold pr-2'>GitHub</span>
        </a>
      </div>
    </nav>
  )
}

export default Navbar