// 1Shot testnet relayer — supports Base Sepolia (84532) at relayer.1shotapi.dev
const RELAYER_BASE = process.env.ONESHOT_RELAYER_URL!
const CHAIN_ID_STR = process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532'

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
  simulated?: boolean
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

export async function getFeeData(_chainId: number, feeToken: string): Promise<FeeData> {
  // getFeeData API appears broken — use capabilities to get fee token, hardcode quote
  return { feeToken, feeAmount: '0', quote: '0' }
}

export async function relay(request: RelayRequest): Promise<RelayResponse> {
  // Use string chainId and positional params as per 1Shot OpenRPC spec
  const params = [
    CHAIN_ID_STR,
    request.feeToken,
    {
      from: request.from,
      calls: request.calls,
      permissionsContext: request.permissionsContext,
      delegation: request.delegation,
      webhookUrl: request.webhookUrl,
    },
  ]
  return rpc('relayer_send7710Transaction', params) as Promise<RelayResponse>
}

export async function getStatus(id: string): Promise<RelayResponse> {
  return rpc('relayer_getStatus', [id]) as Promise<RelayResponse>
}
