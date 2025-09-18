import Head from 'next/head'
import Image from 'next/image'
import React, { useContext, useEffect, useState } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import { useRouter } from 'next/router'
import useAuth, { AuthProvider, AuthContext } from '../hooks/useAuth'

interface Inputs {
    email: string
}
const Reset = () => {
    const {
        resetPass,
        passResetSuccess,
        error,
        loading,
        attemptPassReset,
        setAttemptPassReset,
    } = useAuth()
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<Inputs>()

    const onSubmit: SubmitHandler<Inputs> = async ({ email }) => {
        handleEmailSubmit(email)
    }
    const router = useRouter()

    const [reset, setReset] = useState(true)

    const handleEmailSubmit = async (email: string) => {
        resetPass(email)
    }

    return (
        <div>
            <Head>
                <title>NetTrailer - Reset Password</title>
                <meta name="description" content="Reset your NetTrailer account password" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Image
                src="https://assets.nflxext.com/ffe/siteui/acquisition/login/login-the-crown_2-1500x1000.jpg"
                alt="background"
                fill
                className="-z-10 !hidden  sm:!inline"
                style={{ objectFit: 'cover' }}
                priority
            />
            <Image
                src="https://rb.gy/ulxxee"
                className="absolute left-4 top-4 cursor-pointer object-contain md:left-10 md:top-6"
                width={200}
                height={200}
                alt="Netflix Logo"
                onClick={() => router.push('/login')}
                priority
            />
            <div className="relative flex w-screen">
                <button
                    className="absolute  text-red-600 font-bold  text-lg  right-20 top-10 cursor-pointer hover:underline  font-lex"
                    onClick={() => router.push('/login')}
                >
                    Sign In
                </button>
            </div>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col bg-white/80  mt-32  rounded-md max-w-md mx-auto px-4 py-14"
            >
                <div className="flex flex-col px-10 space-y-4  ">
                    <h1 className="text-3xl font-semibold text-black">
                        Forgot Email/Password
                    </h1>
                    {passResetSuccess && (
                        <div>
                            <p className="p-1  font-sans font-base text-green-500">
                                Password reset email sent!
                            </p>
                        </div>
                    )}
                    {error && !passResetSuccess && (
                        <div>
                            <p className="p-1  font-sans font-base text-red-500">
                                Error: {error}
                            </p>
                        </div>
                    )}
                    <div className="relative">
                        <input
                            type="email"
                            id="email"
                            className="   inputClass peer"
                            placeholder=" "
                            {...register('email', { required: true })}
                        />
                        <label
                            htmlFor="email"
                            className={`labelDefault labelFocus  duration-300 transform -translate-y-4 scale-75 top-4  origin-[0] left-2.5  peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4`}
                        >
                            Email or phone number
                        </label>
                        {errors.email && (
                            <p className="p-1 text-[13px]  font-sans font-base text-orange-500">
                                Please enter a valid email
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-500 text-white rounded-md py-2.5 text-sm font-semibold bac  "
                    >
                        Email Me
                    </button>
                </div>
            </form>
        </div>
    )
}
export default Reset
