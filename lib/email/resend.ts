import { Resend } from 'resend'

// RESEND_API_KEY is optional - email features will be disabled if not provided
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
