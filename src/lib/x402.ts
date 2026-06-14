export interface X402PaymentRequired {
  version: number
  accepts: Array<{
    scheme: string
    network: string
    maxAmountRequired: string
    resource: string
    description: string
    mimeType: string
    payTo: string
    maxTimeoutSeconds: number
    asset: string
    extra?: Record<string, unknown>
  }>
  error?: string
}

export const X402_FACILITATOR = '0xd3eBF3386dA80bCF26E3dBE3cF4f42332bbbcCEb'
export const USDC_BASE_SEPOLIA = process.env.NEXT_PUBLIC_USDC_ADDRESS!

export function buildPaymentRequired(
  priceUsdc: number,
  resource: string,
  description: string
): X402PaymentRequired {
  return {
    version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: String(Math.round(priceUsdc * 1_000_000)),
        resource,
        description,
        mimeType: 'application/json',
        payTo: X402_FACILITATOR,
        maxTimeoutSeconds: 300,
        asset: USDC_BASE_SEPOLIA,
      },
    ],
  }
}

export function hasValidPaymentHeader(request: Request): boolean {
  const payment = request.headers.get('X-Payment')
  return !!payment && payment.length > 10
}
