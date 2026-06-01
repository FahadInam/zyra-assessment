/**
 * Standard error response body. Every error the API returns has the same shape:
 *   { error: "MACHINE_CODE", message: "human readable", requestId?: "..." }
 * Using one builder keeps that consistent across all routes. The optional
 * `requestId` lets a caller correlate a failed response with the server logs.
 */
export function errorBody(error: string, message: string, requestId?: string) {
  return requestId ? { error, message, requestId } : { error, message };
}
