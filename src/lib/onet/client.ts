if (!process.env.ONET_API_KEY) {
  throw new Error(
    'ONET_API_KEY is not set. Register a developer account at '
    + 'https://services.onetcenter.org/developer/signup and generate an '
    + 'API key in My Account, then put it in .env.local as ONET_API_KEY.',
  )
}

const ONET_BASE_URL = 'https://api-v2.onetcenter.org'
const ONET_API_KEY = process.env.ONET_API_KEY

export interface OnetFetchOptions {
  revalidateSeconds?: number
  signal?: AbortSignal
}

export async function onetFetch<T>(
  path: string,
  options: OnetFetchOptions = {},
): Promise<T> {
  const url = `${ONET_BASE_URL}${path}`
  const { revalidateSeconds = 86400, signal } = options

  const response = await fetch(url, {
    headers: {
      'X-API-Key': ONET_API_KEY,
      'Accept': 'application/json',
    },
    next: { revalidate: revalidateSeconds },
    signal,
  })

  if (!response.ok) {
    throw new Error(`O*NET request failed: ${response.status} ${url}`)
  }
  return response.json() as Promise<T>
}
