const RELAYER_BASE = process.env.ONESHOT_RELAYER_URL!

export interface FeeData {
  feeToken: string
  feeAmount: string
  quote: string
}

export interface RelayRequest {
  chainId: number
  from: string
  calls: Array<{
    to: string
    data: string
    value: string
  }>
  delegation: string
  permissionsContext: string
  feeToken: string
  feeQuote: string
  webhookUrl?: string
}

export interface RelayResponse {
  id: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

async function rpc(method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(RELAYER_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params, id: 1, jsonrpc: '2.0' }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`1Shot RPC error: ${json.error.message}`)
  return json.result
}

export async function getFeeData(chainId: number, feeToken: string): Promise<FeeData> {
  return rpc('relayer_getFeeData', [{ chainId, feeToken }]) as Promise<FeeData>
}

export async function relay(request: RelayRequest): Promise<RelayResponse> {
  return rpc('relayer_send7710Transaction', [request]) as Promise<RelayResponse>
}

export async function getStatus(id: string): Promise<RelayResponse> {
  return rpc('relayer_getStatus', [{ id }]) as Promise<RelayResponse>
}
