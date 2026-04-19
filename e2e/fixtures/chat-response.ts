/**
 * Builds a mock Vercel AI SDK data stream response for the chat endpoint.
 * The AI SDK uses a custom text streaming protocol:
 * - Lines prefixed with `0:` are text chunks (JSON-encoded strings)
 * - Lines prefixed with `e:` are finish events
 * - Lines prefixed with `d:` are done events
 *
 * See: https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol#data-stream-protocol
 */

const MOCK_CHAT_RESPONSE = `Hi! I'm Sarah — I've been a Registered Nurse for 8 years, mostly in pediatric ICU at a community hospital in Ohio. Ask me anything about the career or what a typical shift is like. What would you like to know first?`

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
