const Footer = () => {
    return (
        <div className='bg-slate-800 text-white flex flex-col justify-center items-center w-full py-0.5 shrink-0'>
            <div className="logo font-bold text-white text-lg leading-none">
                <span className="text-green-700">&lt;</span>

                <span>Pass</span><span className="text-green-500">OP/&gt;</span>
            </div>
            <div className='flex justify-center items-center text-xs md:text-sm'>
                Created with <img className='w-4 mx-1' src="/icons/heart.png" alt="heart" /> by Pragyesh
            </div>
        </div>
    )
}

export default Footer
