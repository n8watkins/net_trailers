import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable logging
  enableLogs: true,

  // Environment
  environment: process.env.NODE_ENV,

  // Capture console errors
  captureUnhandledRejections: true,

  // Client-specific configurations
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

  // Configure allowed URLs
  allowUrls: [
    // Add your domain when deploying to production
    'localhost',
  ],

  // Ignore common browser errors
  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'ChunkLoadError',
    'Loading chunk',
  ],

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.feedbackIntegration({
      // Display a dark colored theme
      colorScheme: 'dark',
      // Set a custom label for the feedback button
      buttonLabel: '',
      triggerLabel: '',
      triggerAriaLabel: 'Report a bug to our team',
      // Set a custom label for the submit button
      submitButtonLabel: 'Send Bug Report',
      formTitle: 'Bug Report',
      // Set a custom message placeholder
      messagePlaceholder: 'Describe the issue you encountered...',
      // Set a custom name placeholder
      namePlaceholder: 'Your name (optional)',
      // Set a custom email placeholder
      emailPlaceholder: 'Your email (optional)',
      // Custom styles to match Netflix red theme
      themeLight: {
        submitButtonBackground: '#dc2626',
        submitButtonBackgroundHover: '#b91c1c',
        submitButtonForeground: '#ffffff',
      },
      themeDark: {
        background: '#1e293b',
        backgroundHover: '#334155',
        foreground: '#f8fafc',
        border: '#475569',
        submitButtonBackground: '#dc2626',
        submitButtonBackgroundHover: '#b91c1c',
        submitButtonForeground: '#ffffff',
        cancelButtonBackground: '#475569',
        cancelButtonBackgroundHover: '#64748b',
        cancelButtonForeground: '#f8fafc',
      },
    }),
  ],
})