import { ethers } from 'ethers';
import { Buffer } from 'buffer';

/**
 * MetaMask signer for arbundles
 * Compatible with both MetaMask and Privy embedded wallets
 * Based on x402-multi-upload.html example
 *
 * This class allows signing ANS-104 data items using browser wallets
 * that don't expose private keys (MetaMask, Privy, etc.)
 */
export class MetaMaskSigner {
  private signer: ethers.Signer;
  private address: string;
  public signatureType = 3; // Ethereum signature type
  public signatureLength = 65;
  public ownerLength = 65;
  public publicKey: Buffer | null = null;

  constructor(ethersSigner: ethers.Signer, address: string) {
    this.signer = ethersSigner;
    this.address = address;
  }

  /**
   * Derive and set public key by signing a message
   * Only needs to be called once per session
   * The user will be prompted to sign a message in their wallet
   */
  async setPublicKey(): Promise<void> {
    if (!this.publicKey) {
      const message = 'Sign to authorize Arweave uploads';
      const signature = await this.signer.signMessage(message);
      const messageHash = ethers.hashMessage(message);
      const recoveredPublicKey = ethers.SigningKey.recoverPublicKey(
        messageHash,
        signature
      );

      // Convert hex string to Buffer
      const publicKeyHex = recoveredPublicKey.slice(2); // Remove '0x'
      this.publicKey = Buffer.from(publicKeyHex, 'hex');
      console.log('✅ Session authorized for data signing');
    }
  }

  /**
   * Sign data (for arbundles)
   * This is called by arbundles when creating a data item
   */
  async sign(message: Uint8Array): Promise<Buffer> {
    await this.setPublicKey(); // Ensure public key is set
    const signature = await this.signer.signMessage(message);
    return Buffer.from(ethers.getBytes(signature));
  }
}
