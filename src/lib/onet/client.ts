import 'server-only'

if (!process.env.ONET_API_KEY) {
  throw new Error(
    'ONET_API_KEY is not set. Register a free account at '
    + 'https://services.onetcenter.org/ and put the credentials '
    + '(format: "username:password") in .env.local as ONET_API_KEY.',
  )
}

const ONET_BASE_URL = 'https://services.onetcenter.org/v1.9'
const ONET_AUTH = Buffer.from(process.env.ONET_API_KEY).toString('base64')

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
      Authorization: `Basic ${ONET_AUTH}`,
      Accept: 'application/json',
    },
    next: { revalidate: revalidateSeconds },
    signal,
  })

  if (!response.ok) {
    throw new Error(`O*NET request failed: ${response.status} ${url}`)
  }
  return response.json() as Promise<T>
}
