import Head from 'next/head'
import Image from 'next/image'
import React, { useEffect } from 'react'

function SignUp() {
    //state for email and password

    const [email, setEmail] = React.useState('')

    return (
        <div className="absolute w-screen h-[140vh]">
            <Head>
                <title>Netflix</title>
                <link rel="icon" href="/netflix.png" />
            </Head>
            <div className="bg-white h-20"></div>

            <div className="relative flex flex-col w-screen h-[35vw] backGround ">
                <img
                    src="https://rb.gy/ulxxee"
                    className="relative left-4 top-4 cursor-pointer object-contain md:left-10 md:top-6"
                    width={200}
                    height={200}
                />
                <Image
                    src="https://rb.gy/p2hphi"
                    alt="background"
                    fill
                    className="-z-10 !hidden opacity-60 sm:!inline"
                    style={{ objectFit: 'cover' }}
                    priority
                />
                <h1 className="text-[4rem] font-semibold">
                    Unlimited movies, TV shows, and more.
                </h1>
                <p>
                    {' '}
                    Ready to watch? Enter your email to create or restart your
                    membership.
                </p>
                <div className="flex">
                    <div className="relative">
                        <input
                            type="email"
                            id="email"
                            className="   inputClass peer"
                            placeholder=" "
                        />
                        <label
                            htmlFor="email"
                            className={`labelDefault labelFocus  duration-300 transform -translate-y-4 scale-75 top-4  origin-[0] left-2.5  peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4`}
                        >
                            Email
                        </label>
                    </div>

                    <button
                        type="button"
                        className="bg-red-600 text-white rounded-md py-2.5 text-sm font-semibold bac  "
                    >
                        Get Started
                    </button>
                </div>
            </div>
            <div className="relative h-40 bg-black flex flex-row-reverse justify-center space-x-60 ">
                <div className=" flex gap-20 ">
                    <div className=" flex flex-col ">
                        <h1 className="text-[2rem] font-semibold ">
                            Enjoy on your TV.
                        </h1>
                        <p>
                            Watch on Smart TVs, Playstation, Xbox, Chromecast,
                            Apple TV, Blu-ray players, and more.
                        </p>
                    </div>
                    <div>
                        <img
                            src="https://rb.gy/ulxxee"
                            className="relative   object-contain "
                            width={200}
                            height={200}
                        />
                    </div>
                </div>
            </div>
            <div className="relative h-40 bg-black flex flex-row-reverse justify-center space-x-60 ">
                <div className=" flex flex-row-reverse gap-20 ">
                    <div className=" flex flex-col ">
                        <h1 className="text-[2rem] font-semibold ">
                            Enjoy on your TV.
                        </h1>
                        <p>
                            Watch on Smart TVs, Playstation, Xbox, Chromecast,
                            Apple TV, Blu-ray players, and more.
                        </p>
                    </div>
                    <div>
                        <img
                            src="https://rb.gy/ulxxee"
                            className="relative   object-contain "
                            width={200}
                            height={200}
                        />
                    </div>
                </div>
            </div>
            <div className="relative h-40 bg-black flex flex-row-reverse justify-center space-x-60 ">
                <div className=" flex gap-20 ">
                    <div className=" flex flex-col ">
                        <h1 className="text-[2rem] font-semibold ">
                            Enjoy on your TV.
                        </h1>
                        <p>
                            Watch on Smart TVs, Playstation, Xbox, Chromecast,
                            Apple TV, Blu-ray players, and more.
                        </p>
                    </div>
                    <div>
                        <img
                            src="https://rb.gy/ulxxee"
                            className="relative   object-contain "
                            width={200}
                            height={200}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SignUp
