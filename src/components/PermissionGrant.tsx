'use client'

import { useState, useEffect } from 'react'
import { useWalletClient, useAccount } from 'wagmi'
import { createWalletClient, custom } from 'viem'
import { base } from 'viem/chains'
import { erc7715ProviderActions } from '@metamask/smart-accounts-kit/actions'
import { PermissionContext, UserPreferences } from '@/lib/types'

interface Props {
  prefs: UserPreferences
  onGranted: (ctx: PermissionContext) => void
}

export function PermissionGrant({ prefs, onGranted }: Props) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'error'>('idle')
  const [error, setError] = useState<string>('')
  const [mounted, setMounted] = useState(false)
  const { data: walletClient } = useWalletClient()
  const { isConnected } = useAccount()

  useEffect(() => { setMounted(true) }, [])

  async function requestPermission() {
    if (!mounted) return
    if (!walletClient || !isConnected) {
      setError('Wallet not connected. Please go back and connect MetaMask Flask.')
      setStatus('error')
      return
    }
    setStatus('requesting')
    setError('')

    try {
      const extendedClient = createWalletClient({
        account: walletClient.account,
        chain: base,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        transport: custom((window as any).ethereum!),
      }).extend(erc7715ProviderActions())

      const budgetMicro = BigInt(Math.round(prefs.budgetUsdc * 1_000_000))
      const expirySeconds = Math.floor(
        new Date(`${new Date().toDateString()} ${prefs.endTime}`).getTime() / 1000
      )
      const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

      const result = await extendedClient.requestExecutionPermissions([
        {
          chainId: base.id,
          to: walletClient.account.address,
          expiry: expirySeconds,
          permission: {
            type: 'erc20-token-periodic',
            isAdjustmentAllowed: false,
            data: {
              periodAmount: budgetMicro,
              periodDuration: expirySeconds - Math.floor(Date.now() / 1000),
              tokenAddress: usdcAddress,
              justification: `Roam day budget — $${prefs.budgetUsdc} USDC for ${prefs.city}`,
            },
          },
        },
      ])

      const ctx: PermissionContext = {
        permissionsContext: JSON.stringify(result, (_key, val) =>
          typeof val === 'bigint' ? val.toString() : val
        ),
        accountAddress: walletClient.account.address,
        budgetUsdc: prefs.budgetUsdc,
        expiryTimestamp: expirySeconds,
      }

      setStatus('granted')
      onGranted(ctx)
    } catch (err) {
      setError(String(err))
      setStatus('error')
    }
  }

  if (!mounted) return null

  return (
    <div className="flex flex-col items-center gap-4">
      {status === 'idle' && (
        <button
          onClick={requestPermission}
          className="w-full py-4 px-8 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-2xl text-lg transition-all"
        >
          Sign Once & Start Roaming ✨
        </button>
      )}
      {status === 'idle' && !isConnected && (
        <p className="text-red-400 text-xs text-center">
          Wallet not connected — go back and connect MetaMask Flask first
        </p>
      )}
      {status === 'requesting' && (
        <div className="text-violet-400 animate-pulse text-lg text-center">
          Waiting for MetaMask Flask...
        </div>
      )}
      {status === 'granted' && (
        <div className="text-emerald-400 font-semibold text-lg text-center">
          ✅ Permission granted — agent is active
        </div>
      )}
      {status === 'error' && (
        <div className="text-red-400 text-sm text-center">
          <p className="mb-2">{error}</p>
          <button onClick={() => setStatus('idle')} className="underline">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
