// 1Shot public relayer — supports Base mainnet (8453)
const RELAYER_BASE = process.env.ONESHOT_RELAYER_URL!
const IS_TESTNET = process.env.NEXT_PUBLIC_CHAIN_ID === '84532'

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

function fakeHash(): string {
  return '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

export async function getFeeData(chainId: number, feeToken: string): Promise<FeeData> {
  if (IS_TESTNET) {
    return { feeToken, feeAmount: '0', quote: 'simulated' }
  }
  return rpc('relayer_getFeeData', [{ chainId, feeToken }]) as Promise<FeeData>
}

export async function relay(request: RelayRequest): Promise<RelayResponse> {
  if (IS_TESTNET) {
    // Simulate a ~1s relay delay then return a fake confirmed tx
    await new Promise((r) => setTimeout(r, 1200))
    return {
      id: `sim_${Date.now()}`,
      status: 'confirmed',
      txHash: fakeHash(),
      simulated: true,
    }
  }
  return rpc('relayer_send7710Transaction', [request]) as Promise<RelayResponse>
}

export async function getStatus(id: string): Promise<RelayResponse> {
  if (IS_TESTNET) {
    return { id, status: 'confirmed', txHash: fakeHash(), simulated: true }
  }
  return rpc('relayer_getStatus', [{ id }]) as Promise<RelayResponse>
}
