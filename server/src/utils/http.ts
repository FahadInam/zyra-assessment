/**
 * Standard error response body. Every error the API returns has the same shape:
 *   { error: "MACHINE_CODE", message: "human readable" }
 * Using one builder keeps that consistent across all routes.
 */
export function errorBody(error: string, message: string) {
  return { error, message };
}
