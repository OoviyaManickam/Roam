// 1Shot relayer — testnet: relayer.1shotapi.dev, mainnet: relayer.1shotapi.com
const RELAYER_BASE = process.env.ONESHOT_RELAYER_URL!
const CHAIN_ID_STR = process.env.NEXT_PUBLIC_CHAIN_ID ?? '84532'

export interface FeeData {
  feeToken: string
  feeAmount: string
  quote: string
  feeCollector: string
  context: string
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

async function rpc(method: string, params: unknown): Promise<unknown> {
  const res = await fetch(RELAYER_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, params: [params], id: 1, jsonrpc: '2.0' }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`1Shot RPC error: ${json.error.message}`)
  return json.result
}

export async function getFeeData(_chainId: number, feeToken: string): Promise<FeeData> {
  // Skip API call — fee token is known (USDC), use hardcoded values
  return { feeToken, feeAmount: '0', quote: '0', feeCollector: '', context: '' }
}

export async function relay(request: RelayRequest): Promise<RelayResponse> {
  // permissionsContext is the JSON-stringified result from requestExecutionPermissions
  // Parse it back to get the delegation chain array
  let permissionContext: unknown[]
  try {
    const parsed = JSON.parse(request.permissionsContext)
    // MetaMask returns an array of permission contexts
    permissionContext = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    throw new Error('Invalid permissionsContext — expected JSON array from MetaMask Flask')
  }

  const taskId = await rpc('relayer_send7710Transaction', {
    chainId: CHAIN_ID_STR,
    transactions: request.calls.map((call) => ({
      permissionContext,
      executions: [
        {
          target: call.to,
          value: call.value,
          data: call.data,
        },
      ],
    })),
  }) as string

  return {
    id: taskId,
    status: 'pending',
    txHash: undefined,
  }
}

export async function getStatus(id: string): Promise<RelayResponse> {
  const result = await rpc('relayer_getStatus', { id, logs: false }) as Record<string, unknown>
  const receipt = result.receipt as Record<string, unknown> | undefined
  return {
    id,
    status: result.status === 200 ? 'confirmed' : 'pending',
    txHash: receipt?.transactionHash as string | undefined,
  }
}
