import { describe, it, expect, afterEach } from 'vitest'

describe('onetFetch', () => {
  const originalEnv = process.env.ONET_API_KEY

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.ONET_API_KEY
    else process.env.ONET_API_KEY = originalEnv
  })

  it('throws at module import when ONET_API_KEY is missing', async () => {
    delete process.env.ONET_API_KEY
    // Force re-import
    await expect(import('../client?missing=' + Date.now()))
      .rejects.toThrow(/ONET_API_KEY/)
  })
})
