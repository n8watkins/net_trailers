export async function register() {
  // Only initialize Sentry if we have a valid DSN
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!sentryDsn || sentryDsn === 'YOUR_SENTRY_DSN_HERE') {
    console.log('Sentry disabled: No valid DSN provided')
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    const { init } = await import('@sentry/nextjs')

    init({
      dsn: sentryDsn,

      // Performance Monitoring
      tracesSampleRate: 1.0,

      // Enable logging
      enableLogs: true,

      // Environment
      environment: process.env.NODE_ENV,

      // Server-specific configurations
      debug: false,

      // Filter out sensitive data
      beforeSend(event) {
        // Remove sensitive user data
        if (event.user) {
          delete event.user.email
          delete event.user.ip_address
        }
        return event
      },
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    const { init } = await import('@sentry/nextjs')

    init({
      dsn: sentryDsn,

      // Performance Monitoring
      tracesSampleRate: 1.0,

      // Environment
      environment: process.env.NODE_ENV,

      // Edge runtime specific configurations
      debug: false,
    })
  }
}