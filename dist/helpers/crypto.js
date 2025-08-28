"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptPassword = encryptPassword;
exports.decryptPassword = decryptPassword;
exports.isEncrypted = isEncrypted;
exports.generateSecureKey = generateSecureKey;
const crypto_1 = __importDefault(require("../config/crypto"));
const crypto_2 = __importDefault(require("crypto"));
const ALGORITHM = crypto_1.default.algorithm;
const KEY_LENGTH = crypto_1.default.keyLength;
const IV_LENGTH = crypto_1.default.ivLength;
const TAG_LENGTH = crypto_1.default.tagLength;
const SALT_LENGTH = crypto_1.default.saltLength;
// Gerar uma chave a partir da chave mestre do ambiente
function getEncryptionKey() {
    const masterKey = crypto_1.default.masterKey;
    if (!masterKey || masterKey.length < 32) {
        throw new Error('ENCRYPTION_KEY deve ter pelo menos 32 caracteres');
    }
    // Usar PBKDF2 para derivar uma chave consistente e segura
    const salt = Buffer.from('cyberpro-encryption-salt-2024', 'utf8');
    return crypto_2.default.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha512');
}
/**
 * Criptografa uma string usando AES-256-GCM
 * Formato: salt(32bytes) + iv(16bytes) + tag(16bytes) + encrypted_data
 * Resultado em hexadecimal para maior segurança
 */
function encryptPassword(plaintext) {
    try {
        if (!plaintext || typeof plaintext !== 'string') {
            throw new Error('Texto para criptografia deve ser uma string válida');
        }
        const key = getEncryptionKey();
        // Gerar IV único para cada criptografia
        const iv = crypto_2.default.randomBytes(IV_LENGTH);
        // Gerar salt único para esta operação
        const salt = crypto_2.default.randomBytes(SALT_LENGTH);
        // Derivar chave específica para esta operação
        const derivedKey = crypto_2.default.pbkdf2Sync(key, salt, 10000, KEY_LENGTH, 'sha512');
        // Criar cipher com IV
        const cipher = crypto_2.default.createCipheriv(ALGORITHM, derivedKey, iv);
        cipher.setAAD(Buffer.from('cyberpro-password-v2', 'utf8'));
        // Criptografar
        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        // Obter tag de autenticação
        const tag = cipher.getAuthTag();
        // Combinar: salt + iv + tag + encrypted_data
        const combined = Buffer.concat([salt, iv, tag, encrypted]);
        // Retornar em hexadecimal (mais seguro que base64)
        return combined.toString('hex');
    }
    catch (error) {
        throw new Error(`Erro ao criptografar senha: ${error}`);
    }
}
/**
 * Descriptografa uma string criptografada com AES-256-GCM
 */
function decryptPassword(encryptedHex) {
    try {
        if (!encryptedHex || typeof encryptedHex !== 'string') {
            throw new Error('Dados criptografados inválidos');
        }
        // Converter de hex para buffer
        const combined = Buffer.from(encryptedHex, 'hex');
        // Verificar tamanho mínimo
        const minSize = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
        if (combined.length < minSize) {
            throw new Error('Dados criptografados corrompidos - tamanho inválido');
        }
        // Extrair componentes
        let offset = 0;
        const salt = combined.subarray(offset, offset + SALT_LENGTH);
        offset += SALT_LENGTH;
        const iv = combined.subarray(offset, offset + IV_LENGTH);
        offset += IV_LENGTH;
        const tag = combined.subarray(offset, offset + TAG_LENGTH);
        offset += TAG_LENGTH;
        const encrypted = combined.subarray(offset);
        // Derivar chave usando o salt original
        const masterKey = getEncryptionKey();
        const derivedKey = crypto_2.default.pbkdf2Sync(masterKey, salt, 10000, KEY_LENGTH, 'sha512');
        // Criar decipher com IV
        const decipher = crypto_2.default.createDecipheriv(ALGORITHM, derivedKey, iv);
        decipher.setAuthTag(tag);
        decipher.setAAD(Buffer.from('cyberpro-password-v2', 'utf8'));
        // Descriptografar
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString('utf8');
    }
    catch (error) {
        throw new Error(`Erro ao descriptografar senha: ${error}`);
    }
}
/**
 * Verifica se uma string está no formato criptografado correto
 */
function isEncrypted(data) {
    if (!data || typeof data !== 'string')
        return false;
    try {
        // Verificar se é hexadecimal válido
        const buffer = Buffer.from(data, 'hex');
        // Verificar tamanho mínimo esperado
        const minSize = SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1; // +1 para pelo menos 1 byte de dados
        return buffer.length >= minSize && data.length % 2 === 0;
    }
    catch {
        return false;
    }
}
/**
 * Gera uma chave segura para uso em ambiente
 */
function generateSecureKey() {
    return crypto_2.default.randomBytes(64).toString('hex');
}
