/**
 * Builds a mock Vercel AI SDK data stream response for the chat endpoint.
 * The AI SDK uses a custom text streaming protocol:
 * - Lines prefixed with `0:` are text chunks (JSON-encoded strings)
 * - Lines prefixed with `e:` are finish events
 * - Lines prefixed with `d:` are done events
 *
 * See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
 */

const MOCK_CHAT_RESPONSE = `That's a great career choice! **Software Developers** are in high demand and the field offers excellent growth opportunities.

## Day-to-Day Responsibilities

- Writing and reviewing code
- Collaborating with team members on design decisions
- Debugging and fixing issues
- Participating in code reviews and sprint planning

## Getting Started

Most software developers have a bachelor's degree in computer science or a related field, though many successful developers are self-taught or have completed coding bootcamps.

The median salary is around **$120,000** and job growth is projected at **25%** over the next decade — much faster than average.`

/**
 * Encodes a chat response as a Vercel AI SDK data stream.
 * Splits the response into chunks to simulate realistic streaming.
 */
export function buildChatStreamBody(): string {
  const chunks = MOCK_CHAT_RESPONSE.match(/[\s\S]{1,40}/g) ?? [MOCK_CHAT_RESPONSE]
  const lines: string[] = []
  for (const chunk of chunks) {
    lines.push(`0:${JSON.stringify(chunk)}\n`)
  }
  lines.push(`e:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":200},"isContinued":false}\n`)
  lines.push(`d:{"finishReason":"stop","usage":{"promptTokens":100,"completionTokens":200}}\n`)
  return lines.join('')
}

export { MOCK_CHAT_RESPONSE }
