import '@testing-library/jest-dom/vitest'

// Provide a dummy ONET_API_KEY so modules that transitively import the
// server-only onet client don't throw at load time. Tests that need to
// exercise the missing-env path (see client.test.ts) delete and restore
// this value themselves.
process.env.ONET_API_KEY ??= 'test-user:test-pass'
