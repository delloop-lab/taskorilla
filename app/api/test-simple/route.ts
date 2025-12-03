import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'GET works!' })
}

export async function POST(req: Request) {
  const body = await req.json()
  return NextResponse.json({ 
    message: 'POST works!',
    received: body 
  })
}


