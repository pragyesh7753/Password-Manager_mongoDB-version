const Footer = () => {
    return (
        <div className='bg-slate-800 text-white flex flex-col justify-center items-center w-full py-1 px-3 shrink-0'>
            <div className="logo font-bold text-white text-base sm:text-lg leading-none whitespace-nowrap">
                <span className="text-green-700">&lt;</span>

                <span>Pass</span><span className="text-green-500">OP/&gt;</span>
            </div>
            <div className='flex justify-center items-center text-[11px] sm:text-xs md:text-sm text-center wrap-break-word'>
                Created with <img className='w-4 mx-1' src="/icons/heart.png" alt="heart" /> by Pragyesh
            </div>
        </div>
    )
}

export default Footer
