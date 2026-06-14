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

export function trackSpend(walletAddress: string, amountUsdc: number): number {
  const current = spendTracker.get(walletAddress) ?? 0
  const updated = current + amountUsdc
  spendTracker.set(walletAddress, updated)
  return updated
}

export function getTotalSpend(walletAddress: string): number {
  return spendTracker.get(walletAddress) ?? 0
}

export function isBudgetExceeded(
  walletAddress: string,
  amountUsdc: number,
  budgetUsdc: number
): boolean {
  const current = spendTracker.get(walletAddress) ?? 0
  return current + amountUsdc > budgetUsdc
}
