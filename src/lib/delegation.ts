import { encodeFunctionData, parseUnits } from 'viem'

const TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const spendTracker = new Map<string, number>()

function sessionKey(walletAddress: string, expiryTimestamp: number): string {
  return `${walletAddress}:${expiryTimestamp}`
}

export function buildTransferCall(
  usdcAddress: `0x${string}`,
  toAddress: `0x${string}`,
  amountUsdc: number
) {
  const amount = parseUnits(amountUsdc.toFixed(6), 6)
  const data = encodeFunctionData({
    abi: TRANSFER_ABI,
    functionName: 'transfer',
    args: [toAddress, amount],
  })
  return { to: usdcAddress, data, value: '0x0' }
}

export function trackSpend(walletAddress: string, amountUsdc: number, expiryTimestamp = 0): number {
  const key = sessionKey(walletAddress, expiryTimestamp)
  const current = spendTracker.get(key) ?? 0
  const updated = current + amountUsdc
  spendTracker.set(key, updated)
  return updated
}

export function getTotalSpend(walletAddress: string, expiryTimestamp = 0): number {
  return spendTracker.get(sessionKey(walletAddress, expiryTimestamp)) ?? 0
}

export function isBudgetExceeded(
  walletAddress: string,
  amountUsdc: number,
  budgetUsdc: number,
  expiryTimestamp = 0
): boolean {
  const current = spendTracker.get(sessionKey(walletAddress, expiryTimestamp)) ?? 0
  return current + amountUsdc > budgetUsdc
}
