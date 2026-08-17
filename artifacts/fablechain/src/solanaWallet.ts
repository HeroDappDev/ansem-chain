import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { base58 } from '@scure/base';
import { HDKey } from '@scure/bip32';

const HARDENED_OFFSET = 0x80000000;

const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";
const EVM_DERIVATION_PATH = "m/44'/60'/0'/0/0";

function ser32(index: number): Uint8Array {
  const buf = new Uint8Array(4);
  new DataView(buf.buffer).setUint32(0, index >>> 0, false);
  return buf;
}

function deriveEd25519Seed(path: string, seed: Uint8Array): Uint8Array {
  const enc = new TextEncoder();
  let I = hmac(sha512, enc.encode('ed25519 seed'), seed);
  let IL = I.slice(0, 32);
  let IR = I.slice(32);

  const segments = path
    .replace(/^m\//, '')
    .split('/')
    .map((segment) => (parseInt(segment.replace("'", ''), 10) + HARDENED_OFFSET) >>> 0);

  for (const index of segments) {
    const data = new Uint8Array(37);
    data[0] = 0x00;
    data.set(IL, 1);
    data.set(ser32(index), 33);
    I = hmac(sha512, IR, data);
    IL = I.slice(0, 32);
    IR = I.slice(32);
  }

  return IL;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function toChecksumAddress(hex40: string): string {
  const lower = hex40.toLowerCase();
  const hash = toHex(keccak_256(new TextEncoder().encode(lower)));
  let out = '0x';
  for (let i = 0; i < lower.length; i++) {
    out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

function solanaAddressFromSeed(derived: Uint8Array): string {
  const publicKey = ed25519.getPublicKey(derived);
  return base58.encode(publicKey);
}

function evmAddressFromSeed(seed: Uint8Array): string {
  const hd = HDKey.fromMasterSeed(seed).derive(EVM_DERIVATION_PATH);
  if (!hd.privateKey) throw new Error('Failed to derive EVM private key');
  const uncompressed = secp256k1.getPublicKey(hd.privateKey, false); // 65 bytes, 0x04 prefix
  const hash = keccak_256(uncompressed.slice(1));
  return toChecksumAddress(toHex(hash.slice(-20)));
}

export interface GeneratedWallet {
  mnemonic: string;
  evmAddress: string;
  evmPath: string;
  solanaAddress: string;
  solanaPath: string;
}

export function generateWallet(): GeneratedWallet {
  const mnemonic = generateMnemonic(wordlist, 128);
  const seed = mnemonicToSeedSync(mnemonic);
  const solanaSeed = deriveEd25519Seed(SOLANA_DERIVATION_PATH, seed);
  return {
    mnemonic,
    evmAddress: evmAddressFromSeed(seed),
    evmPath: EVM_DERIVATION_PATH,
    solanaAddress: solanaAddressFromSeed(solanaSeed),
    solanaPath: SOLANA_DERIVATION_PATH,
  };
}
