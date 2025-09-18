import React, { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'
import useAuth from '../hooks/useAuth'
function Header() {
    const [isScrolled, setIsScrolled] = useState(false)
    const { logOut } = useAuth()
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true)
            } else {
                setIsScrolled(false)
            }
        }

        window.addEventListener('scroll', handleScroll)

        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    return (
        <header className={`${isScrolled && 'bg-[#141414]'}`}>
            <div className="flex w-full items-center space-x-2 md:space-x-10  ">
                <Image
                    src="https://rb.gy/ulxxee"
                    width={100}
                    height={100}
                    alt="Netflix Logo"
                    className="cursor-pointer object-contain"
                    priority
                />
                <ul className=" hidden space-x-4 md:flex  ">
                    <li className="headerLink cursor-default text-white hover:text-white">
                        Home
                    </li>
                    <li className="headerLink">TV Shows</li>
                    <li className="headerLink">Movies</li>
                    <li className="headerLink">New & Popular</li>
                    <li className="headerLink">My List</li>
                </ul>
            </div>
            <div className="flex items-center space-x-4 text-sm font-light  ">
                <MagnifyingGlassIcon className="  h-6 w-6 cursor-pointer" />
                <BellIcon className="hidden h-6 w-6 sm:inline cursor-pointer" />

                <Image
                    onClick={logOut}
                    src="https://occ-0-3997-3996.1.nflxso.net/dnm/api/v6/K6hjPJd6cR6FpVELC5Pd6ovHRSk/AAAABX5_zNxCZOEGlSGykILrWVH75fVZe_-5H9HlAXtJoNs6AK8FTjyMG-llwgLJXGA8RUwxotwOOHMh3ovdrXFpq9-J4CBmFKA.png?r=1d4"
                    alt="User Profile"
                    width={32}
                    height={32}
                    className="rounded h-8 w-8 cursor-pointer"
                />
            </div>
        </header>
    )
}

export default Header
