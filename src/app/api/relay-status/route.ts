import { NextRequest, NextResponse } from 'next/server'
import { getStatus } from '@/lib/oneshot'

export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get('taskId')
  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }
  try {
    const result = await getStatus(taskId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[relay-status] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
