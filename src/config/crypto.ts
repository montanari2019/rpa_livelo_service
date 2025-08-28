const {
    ENCRYPTION_KEY,
    CRYPTO_ALGORITHM,
    CRYPTO_KEY_LENGTH,
    CRYPTO_IV_LENGTH,
    CRYPTO_TAG_LENGTH,
    CRYPTO_SALT_LENGTH,
} = process.env;

const cryptoConfig = {
    masterKey: ENCRYPTION_KEY!,
    algorithm: CRYPTO_ALGORITHM!,
    keyLength: Number(CRYPTO_KEY_LENGTH!),
    ivLength: Number(CRYPTO_IV_LENGTH!),
    tagLength: Number(CRYPTO_TAG_LENGTH!),
    saltLength: Number(CRYPTO_SALT_LENGTH!),
};

export default cryptoConfig;
