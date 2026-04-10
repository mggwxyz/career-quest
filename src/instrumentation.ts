export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.TEST_MSW === 'true') {
    const { setupServer } = await import('msw/node')
    const { handlers } = await import('../e2e/msw/handlers')

    const server = setupServer(...handlers)
    server.listen({ onUnhandledRequest: 'bypass' })

    console.log('[MSW] Mock server started for e2e tests')
  }
}
