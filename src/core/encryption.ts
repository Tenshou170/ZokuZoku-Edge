import { Buffer } from 'buffer';
import { logger } from '../logger';
import { getGameRegion } from './utils';

// Asset Bundle Key - preserved for asset decryption
const AB_KEY = Buffer.from("532B4631E4A7B9473E7CFB", "hex");

export { AB_KEY };

/**
 * Detects which key type to use based on settings / path auto-detection.
 */
export function detectKeyType(): string {
    return getGameRegion();
}

export function isMetaEncrypted(): boolean {
    return detectKeyType() !== "tw";
}

export function getMetaDatabaseKey(): string {
    const keyType = detectKeyType();

    logger.log(`[Encryption] Selected key type: ${keyType}`);

    if (keyType === "jp") {
        return "9c2bab97bcf8c0c4f1a9ea7881a213f6c9ebf9d8d4c6a8e43ce5a259bde7e9fd";
    }

    if (keyType === "eng") {
        return "c753a5e8f5f78294f7fef57df4a14ffbf9a896cea1d4e09947e0d904e7fde8eaf0";
    }

    logger.log(`[Encryption] Region '${keyType}' has no encryption key — meta DB is unencrypted.`);
    return "";
}

/**
 * Derives asset bundle decryption key from the long key stored in meta database.
 */
export function deriveAssetKey(keyLong: bigint | number): Buffer | null {
    if (keyLong === 0 || keyLong === 0n) {
        return null;
    }

    const keyBytes = Buffer.allocUnsafe(8);
    keyBytes.writeBigInt64LE(BigInt(keyLong));

    const baseKey = AB_KEY;
    const baseLen = baseKey.length;
    const finalKey = Buffer.allocUnsafe(baseLen * 8);

    for (let i = 0; i < baseLen; i++) {
        const b = baseKey[i];
        const baseOffset = i * 8;

        for (let j = 0; j < 8; j++) {
            finalKey[baseOffset + j] = b ^ keyBytes[j];
        }
    }

    return finalKey;
}

/**
 * Decrypts asset bundle data in-place.
 * Only bytes after position 256 are encrypted.
 */
export function decryptAssetBundle(data: Buffer, encryptionKey: bigint | number): Buffer {
    const key = deriveAssetKey(encryptionKey);

    if (!key) {
        return data;
    }

    const decrypted = Buffer.from(data);

    if (decrypted.length > 256) {
        const keyLen = key.length;
        for (let j = 256; j < decrypted.length; j++) {
            decrypted[j] ^= key[j % keyLen];
        }
    }

    return decrypted;
}

export function encryptAssetBundle(data: Buffer, encryptionKey: bigint | number): Buffer {
    return decryptAssetBundle(data, encryptionKey);
}
