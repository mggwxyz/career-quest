import type { Instrumentation } from 'next'
import { captureErrorEvent, errorToEventFields } from '@/lib/error-events'

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  const fields = errorToEventFields(error)
  await captureErrorEvent({
    source: 'server',
    ...fields,
    route: request.path,
    method: request.method,
    metadata: {
      routerKind: context.routerKind,
      routeType: context.routeType,
      routePath: context.routePath,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    },
  })
}
