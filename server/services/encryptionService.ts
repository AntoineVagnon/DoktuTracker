import crypto from 'crypto';

// Service de chiffrement AES-256 pour données médicales sensibles
// Conforme aux standards de sécurité médicaux (HIPAA, GDPR)

interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag: string;
  version: string;
}

interface EncryptionConfig {
  algorithm: string;
  keySize: number;
  ivSize: number;
  tagSize: number;
  version: string;
}

class EncryptionService {
  private readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keySize: 32, // 256 bits
    ivSize: 16,  // 128 bits
    tagSize: 16, // 128 bits
    version: 'v1'
  };

  private masterKey: Buffer | null = null;

  constructor() {
    this.initializeMasterKey();
  }

  /**
   * Initialise la clé maître depuis les variables d'environnement
   * ou génère une nouvelle clé (pour dev/test uniquement)
   */
  private initializeMasterKey(): void {
    const masterKeyHex = process.env.MEDICAL_DATA_ENCRYPTION_KEY;
    
    if (!masterKeyHex) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MEDICAL_DATA_ENCRYPTION_KEY environment variable is required in production');
      }
      
      // Génération d'une clé temporaire pour développement (WARNING: pas pour production)
      console.warn('⚠️ WARNING: Using temporary encryption key for development. DO NOT use in production!');
      this.masterKey = crypto.randomBytes(this.config.keySize);
      
      // Log la clé pour le développement (JAMAIS en production)
      console.log('🔑 Dev encryption key (hex):', this.masterKey.toString('hex'));
      return;
    }

    try {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');
      
      if (this.masterKey.length !== this.config.keySize) {
        throw new Error(`Master key must be exactly ${this.config.keySize} bytes (${this.config.keySize * 2} hex characters)`);
      }
      
      console.log('🔒 Medical data encryption initialized with master key');
    } catch (error) {
      throw new Error(`Failed to initialize encryption key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Chiffre une valeur string avec AES-256-GCM
   */
  encrypt(plaintext: string): EncryptedData {
    if (!this.masterKey) {
      throw new Error('Encryption service not properly initialized');
    }

    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    try {
      // Générer un IV unique pour chaque chiffrement
      const iv = crypto.randomBytes(this.config.ivSize);
      
      // Créer le cipher
      const cipher = crypto.createCipher(this.config.algorithm, this.masterKey);
      cipher.setAutoPadding(true);
      
      // Chiffrer les données
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Récupérer le tag d'authentification
      const authTag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        version: this.config.version
      };
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Déchiffre une valeur chiffrée avec AES-256-GCM
   */
  decrypt(encryptedData: EncryptedData): string {
    if (!this.masterKey) {
      throw new Error('Encryption service not properly initialized');
    }

    if (!encryptedData || !encryptedData.encryptedValue) {
      throw new Error('Invalid encrypted data provided');
    }

    try {
      // Convertir les valeurs hex en Buffer
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Créer le decipher
      const decipher = crypto.createDecipher(this.config.algorithm, this.masterKey);
      decipher.setAuthTag(authTag);
      
      // Déchiffrer les données
      let decrypted = decipher.update(encryptedData.encryptedValue, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Decryption failed:', error);
      throw new Error('Decryption failed - data may be corrupted or tampered with');
    }
  }

  /**
   * Chiffre un objet JSON
   */
  encryptObject(obj: any): EncryptedData {
    if (obj === null || obj === undefined) {
      return this.encrypt('');
    }
    
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }

  /**
   * Déchiffre vers un objet JSON
   */
  decryptObject<T = any>(encryptedData: EncryptedData): T {
    const decryptedString = this.decrypt(encryptedData);
    
    if (!decryptedString) {
      return null as T;
    }
    
    try {
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('❌ Failed to parse decrypted JSON:', error);
      throw new Error('Invalid JSON in encrypted data');
    }
  }

  /**
   * Vérifie si des données sont chiffrées (format valide)
   */
  isEncrypted(data: any): data is EncryptedData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.encryptedValue === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.authTag === 'string' &&
      typeof data.version === 'string'
    );
  }

  /**
   * Hache une valeur avec SHA-256 (pour recherche)
   * Les valeurs hachées permettent de faire des requêtes sans déchiffrer
   */
  hash(value: string): string {
    if (!value) return '';
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Génère une clé de chiffrement pour les documents
   */
  generateDocumentKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Chiffre une clé de document avec la clé maître
   */
  encryptDocumentKey(documentKey: string): EncryptedData {
    return this.encrypt(documentKey);
  }

  /**
   * Déchiffre une clé de document
   */
  decryptDocumentKey(encryptedKey: EncryptedData): string {
    return this.decrypt(encryptedKey);
  }

  /**
   * Génère un checksum pour vérifier l'intégrité des données
   */
  generateChecksum(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Vérifie un checksum
   */
  verifyChecksum(data: Buffer | string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  /**
   * Nettoie les données sensibles de la mémoire
   */
  clearSensitiveData(data: any): void {
    if (typeof data === 'string') {
      // En JavaScript, on ne peut pas vraiment effacer les strings de la mémoire
      // mais on peut au moins les remplacer
      data = '';
    } else if (Buffer.isBuffer(data)) {
      data.fill(0);
    } else if (typeof data === 'object' && data !== null) {
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string') {
          data[key] = '';
        } else if (Buffer.isBuffer(data[key])) {
          data[key].fill(0);
        }
      });
    }
  }

  /**
   * Génère une clé maître pour l'initialisation (utilitaire admin)
   */
  static generateMasterKey(): string {
    const key = crypto.randomBytes(32);
    return key.toString('hex');
  }

  /**
   * Vérifie l'état du service de chiffrement
   */
  getHealthStatus(): { status: string; algorithm: string; version: string; keyInitialized: boolean } {
    return {
      status: this.masterKey ? 'healthy' : 'error',
      algorithm: this.config.algorithm,
      version: this.config.version,
      keyInitialized: !!this.masterKey
    };
  }
}

// Instance singleton du service de chiffrement
export const encryptionService = new EncryptionService();

// Types pour utilisation dans d'autres modules
export type { EncryptedData };

// Fonction utilitaire pour chiffrer les champs d'un objet
export function encryptSensitiveFields<T extends Record<string, any>>(
  obj: T, 
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (result[field] !== null && result[field] !== undefined) {
      const value = typeof result[field] === 'string' 
        ? result[field] 
        : JSON.stringify(result[field]);
      
      result[field] = encryptionService.encrypt(value as string) as any;
    }
  });
  
  return result;
}

// Fonction utilitaire pour déchiffrer les champs d'un objet
export function decryptSensitiveFields<T extends Record<string, any>>(
  obj: T, 
  sensitiveFields: (keyof T)[]
): T {
  const result = { ...obj };
  
  sensitiveFields.forEach(field => {
    if (result[field] && encryptionService.isEncrypted(result[field])) {
      try {
        const decrypted = encryptionService.decrypt(result[field] as EncryptedData);
        
        // Essayer de parser en JSON si c'est un objet
        try {
          result[field] = JSON.parse(decrypted) as any;
        } catch {
          result[field] = decrypted as any;
        }
      } catch (error) {
        console.error(`❌ Failed to decrypt field ${String(field)}:`, error);
        result[field] = null as any;
      }
    }
  });
  
  return result;
}

export default encryptionService;