import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  return NextResponse.json({
    url: request.url,
    headers,
    method: request.method,
  })
}
