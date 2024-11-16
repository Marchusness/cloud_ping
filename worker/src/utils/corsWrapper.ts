import { CORS_HEADERS } from "../constants/corsHeaders";

export async function corsWrapper(handler: () => Promise<{
  body: string | null;
  status: number;
  headers?: Record<string, string>;
}>): Promise<Response> {
  const {
    body,
    status,
    headers,
  } = await handler();

  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
      ...CORS_HEADERS,
    },
  });
}
