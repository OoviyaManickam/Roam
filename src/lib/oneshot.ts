import { bytesToHex } from 'viem/utils'
import { encodeFunctionData, erc20Abi, parseUnits } from 'viem'
import { decodeDelegations } from '@metamask/smart-accounts-kit/utils'

const RELAYER_BASE = process.env.ONESHOT_RELAYER_URL!
const CHAIN_ID_STR = process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453'
const FEE_COLLECTOR = '0xE936e8FAf4A5655469182A49a505055B71C17604' as `0x${string}`
const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ?? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913') as `0x${string}`
const MIN_FEE = parseUnits('0.01', 6)

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
  destinationUrl?: string
}

export interface RelayResponse {
  id: string
  status: 'pending' | 'submitted' | 'confirmed' | 'failed'
  txHash?: string
}

function toRelayerJson(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'bigint') return `0x${value.toString(16)}`
  if (value instanceof Uint8Array) return bytesToHex(value)
  if (Array.isArray(value)) return value.map(toRelayerJson)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toRelayerJson(v)
    return out
  }
  return value
}

async function rpc(method: string, params: unknown): Promise<unknown> {
  const res = await fetch(RELAYER_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })
  const json = await res.json()
  if (json.error) throw new Error(`1Shot RPC error: [${json.error.code}] ${json.error.message}`)
  return json.result
}

export async function getFeeData(_chainId: number, feeToken: string): Promise<FeeData> {
  return { feeToken, feeAmount: '0', quote: '0' }
}

export async function relay(request: RelayRequest): Promise<RelayResponse> {
  let delegations: unknown[]
  try {
    const decoded = decodeDelegations(request.permissionsContext as `0x${string}`)
    delegations = decoded.map((d) => toRelayerJson(d)) as unknown[]
  } catch {
    try {
      const parsed = JSON.parse(request.permissionsContext)
      delegations = Array.isArray(parsed) ? parsed.map(toRelayerJson) : [toRelayerJson(parsed)]
    } catch {
      throw new Error('Invalid permissionsContext — cannot decode delegation chain')
    }
  }

  const feeExecution = {
    target: USDC_ADDRESS,
    value: '0x0',
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [FEE_COLLECTOR, MIN_FEE],
    }),
  }

  const payload: Record<string, unknown> = {
    chainId: CHAIN_ID_STR,
    transactions: request.calls.map((call) => ({
      permissionContext: delegations,
      executions: [
        feeExecution,
        { target: call.to, value: call.value, data: call.data },
      ],
    })),
  }

  // Webhook URL for status updates — preferred over polling
  if (request.destinationUrl) {
    payload.destinationUrl = request.destinationUrl
  }

  console.log('[1shot] submitting to', RELAYER_BASE, 'chainId:', CHAIN_ID_STR)
  const taskId = await rpc('relayer_send7710Transaction', payload) as string
  console.log('[1shot] taskId:', taskId)

  return { id: taskId, status: 'pending' }
}

export async function getStatus(id: string): Promise<RelayResponse> {
  const result = await rpc('relayer_getStatus', { id, logs: false }) as Record<string, unknown>
  console.log('[1shot] getStatus raw:', JSON.stringify(result))
  const receipt = result.receipt as Record<string, unknown> | undefined
  const statusCode = result.status as number
  let status: RelayResponse['status'] = 'pending'
  if (statusCode === 200) status = 'confirmed'
  else if (statusCode === 400 || statusCode === 500) status = 'failed'
  else if (statusCode === 110) status = 'submitted'
  const txHash = receipt?.transactionHash as string | undefined
    ?? result.hash as string | undefined
    ?? result.txHash as string | undefined
    ?? result.transactionHash as string | undefined
  console.log('[1shot] resolved txHash:', txHash, 'statusCode:', statusCode)
  return { id, status, txHash }
}
