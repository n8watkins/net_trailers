import Head from 'next/head'
import Image from 'next/image'
import React, { useEffect } from 'react'
import { SubmitHandler, useForm } from 'react-hook-form'
import useAuth from '../hooks/useAuth'
import { useRouter } from 'next/router'
import reset from './reset'

interface Inputs {
    email: string
    password: string
}

function login() {
    const router = useRouter()

    const [login, setLogin] = React.useState(false)

    const {
        error,
        loading,
        logOut,
        signIn,
        signInWithGoogle,
        signUp,
        user,
        resetPass,
        passResetSuccess,
        attemptPassReset,
        setAttemptPassReset,
    } = useAuth()

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<Inputs>()

    const onSubmit: SubmitHandler<Inputs> = async ({ email, password }) => {
        if (login) {
            signIn(email, password)
        } else {
            signUp(email, password)
        }
    }

    const [isChecked, setIsChecked] = React.useState(false)

    const handleChecked = () => {
        setIsChecked(!isChecked)
    }

    const handlePasswordReset = () => {
        router.push('/reset')
        setAttemptPassReset(true)
    }

    return (
        <div className="absolute w-screen 2xl:h-[48.8vw] h-screen bg-gradient-to-br  from-black/70 to-black/20 ">
            <Head>
                <title>Netflix</title>
                <link rel="icon" href="/netflix-icon.png" />
            </Head>
            <Image
                src="https://rb.gy/p2hphi"
                alt="background"
                fill
                className="absolute  -z-10 !hidden    sm:!inline"
                style={{ objectFit: 'cover' }}
                priority
            />
            <img
                src="https://rb.gy/ulxxee"
                className="absolute left-4 top-4 cursor-pointer object-contain md:left-10 md:top-6"
                width={200}
                height={200}
            />
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col bg-black/70  mt-32  rounded-md max-w-md mx-auto px-4 py-14"
            >
                <div className="flex flex-col px-10 space-y-4  ">
                    <h1 className="text-3xl font-semibold">Sign In</h1>

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
                    <div className="relative">
                        <input
                            type="password"
                            id="password"
                            className="   inputClass peer"
                            placeholder=" "
                            {...register('password', { required: true })}
                        />
                        <label
                            htmlFor="password"
                            className={`labelDefault labelFocus  duration-300 transform -translate-y-4 scale-75 top-4  origin-[0] left-2.5  peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4`}
                        >
                            Password
                        </label>
                        {errors.email && (
                            <p className="p-1 text-[13px]  font-sans font-base text-orange-500">
                                Please enter a valid password
                            </p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="bg-red-600 text-white rounded-md py-2.5 text-sm font-semibold bac  "
                        onClick={() => setLogin(true)}
                    >
                        Sign In
                    </button>
                    <div className=" flex justify-between text-[#b3b3b3]">
                        <div className="flex space-x-1 ">
                            <input
                                type="checkbox"
                                id="rememberMe"
                                checked={isChecked}
                                onChange={() => handleChecked()}
                            />
                            <label className="">
                                <span onClick={() => handleChecked()}>
                                    Remember me
                                </span>
                            </label>
                        </div>
                        <span
                            className="cursor-pointer hover:underline "
                            onClick={() => handlePasswordReset()}
                        >
                            Need help?
                        </span>
                    </div>
                    <div className="flex space-x-1">
                        <span>New to Netflix? {` `}</span>
                        <button
                            className="text-white hover:underline  cursor-pointer"
                            onClick={() => setLogin(false)}
                        >
                            Sign up now.
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}

export default login
