/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NODE_ENV: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
  readonly VITE_SOLANA_RPC: string
  readonly VITE_PAYMENT_SERVICE_URL: string
  readonly VITE_UPLOAD_SERVICE_URL: string
  readonly VITE_TURBO_GATEWAY_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY_PROD: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY_TEST: string
  readonly PROD: boolean
  readonly DEV: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  arweaveWallet: {
    connect(permissions: string[]): Promise<void>
    disconnect(): Promise<void>
    getActiveAddress(): Promise<string>
    getActivePublicKey(): Promise<string>
    sign(transaction: any): Promise<any>
    dispatch(transaction: any): Promise<any>
  }
}