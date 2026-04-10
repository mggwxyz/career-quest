import { http, HttpResponse } from 'msw'
import { mockCareers } from '../fixtures/career-recommendations'

/**
 * MSW handler that intercepts POST requests to the OpenAI chat completions API.
 * Returns a response shaped like what the Vercel AI SDK's generateObject() expects:
 * a JSON object wrapped in the OpenAI chat completion format.
 */
export const handlers = [
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json() as { response_format?: { type: string } }

    // generateObject uses response_format.type = "json_schema"
    // streamText does NOT — it's plain text streaming
    const isStructuredOutput = body?.response_format?.type === 'json_schema'

    if (isStructuredOutput) {
      // Mock for generateObject() — return the careers fixture
      return HttpResponse.json({
        id: 'chatcmpl-mock-e2e',
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'gpt-4o-2024-05-13',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: JSON.stringify(mockCareers),
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 800, total_tokens: 1300 },
      })
    }

    // For any other OpenAI call (shouldn't happen since chat streaming
    // is intercepted by Playwright page.route), return a simple response
    return HttpResponse.json({
      id: 'chatcmpl-mock-fallback',
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: 'gpt-4o-2024-05-13',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: 'Mock response from e2e test.' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    })
  }),
]
