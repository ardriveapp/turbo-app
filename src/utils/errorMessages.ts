/**
 * Convert technical error messages to user-friendly messages
 * Provides actionable guidance without overwhelming the user
 */

export function formatUploadError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  // Insufficient balance errors
  if (lowerMessage.includes('insufficient balance') || lowerMessage.includes('insufficient funds')) {
    return 'Insufficient credits. Please top up your balance or increase your JIT payment limit.';
  }

  // JIT payment errors
  if (lowerMessage.includes('jit') || lowerMessage.includes('on-demand')) {
    if (lowerMessage.includes('max') || lowerMessage.includes('limit')) {
      return 'JIT payment limit too low. Please increase the maximum amount in Advanced Settings.';
    }
    return 'JIT payment failed. Try increasing your payment limit or topping up with credits first.';
  }

  // Network/connection errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed') || lowerMessage.includes('failed to fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Wallet/authentication errors
  if (lowerMessage.includes('wallet not connected') || lowerMessage.includes('not connected')) {
    return 'Wallet disconnected. Please reconnect your wallet and try again.';
  }

  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
    return 'Transaction cancelled. You declined the signature request.';
  }

  if (lowerMessage.includes('signature') || lowerMessage.includes('signing')) {
    return 'Signature failed. Please try again and approve the wallet prompt.';
  }

  // File size errors
  if (lowerMessage.includes('too large') || lowerMessage.includes('file size')) {
    return 'File too large. Please reduce the file size and try again.';
  }

  // X402 specific errors
  if (lowerMessage.includes('x402')) {
    if (lowerMessage.includes('network') || lowerMessage.includes('switch')) {
      return 'Wrong network. Please switch to Base network in your wallet.';
    }
    if (lowerMessage.includes('usdc')) {
      return 'X402 payment failed. Try using BASE-ETH instead or top up with credits.';
    }
    return 'X402 payment failed. Try selecting a different payment method.';
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Permission errors
  if (lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
    return 'Permission denied. Please check your wallet permissions.';
  }

  // Generic server errors
  if (lowerMessage.includes('500') || lowerMessage.includes('internal server error')) {
    return 'Server error. Please try again in a moment.';
  }

  if (lowerMessage.includes('503') || lowerMessage.includes('service unavailable')) {
    return 'Service temporarily unavailable. Please try again shortly.';
  }

  // If we have a reasonably short and clear message, use it
  if (message.length < 100 && !message.includes('Error:') && !message.includes('TypeError')) {
    return message;
  }

  // Fallback for unclear errors
  return 'Upload failed. Please try again or contact support if the issue persists.';
}
