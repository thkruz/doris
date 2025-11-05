import { errorManagerInstance } from './errorManager';

export enum StorageKey {
  VERSION = 'v2-version',
}
export class PersistenceManager {
  private readonly storage_: Storage;

  private static instance_: PersistenceManager;

  private constructor() {
    this.storage_ = localStorage;
    this.validateStorage();
    this.verifyStorage();
  }

  get storage(): Storage {
    return this.storage_;
  }

  static getInstance(): PersistenceManager {
    if (!PersistenceManager.instance_) {
      PersistenceManager.instance_ = new PersistenceManager();
    }

    return PersistenceManager.instance_;
  }

  validateStorage(): void {
    const currentVersion = this.storage_.getItem(StorageKey.VERSION);

    if (
      typeof currentVersion === 'string' &&
      typeof settingsManager.versionNumber === 'string' &&
      this.compareSemver_(currentVersion, settingsManager.versionNumber) < 0
    ) {
      // Handle version mismatch
      console.warn(`Version mismatch: ${currentVersion} < ${settingsManager.versionNumber}`);
      console.warn('Clearing local storage...');
      // Perform any necessary migration or cleanup
      this.storage_.clear();
    }

    // Save the current version to storage
    this.storage_.setItem(StorageKey.VERSION, settingsManager.versionNumber);
  }

  /**
   * Compares two semantic version strings.
   *
   * Splits each version string by '.' and compares each numeric part sequentially.
   * Returns -1 if `a` is less than `b`, 1 if `a` is greater than `b`, and 0 if they are equal.
   * Handles versions of different lengths by treating missing parts as 0.
   *
   * @param a - The first semantic version string (e.g., "1.2.3").
   * @param b - The second semantic version string (e.g., "1.2.4").
   * @returns A number indicating the comparison result:
   *          -1 if `a` < `b`, 1 if `a` > `b`, 0 if equal.
   */
  private compareSemver_(a: string, b: string): number {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);

    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;

      if (na < nb) {
        return -1;
      }
      if (na > nb) {
        return 1;
      }
    }

    return 0;
  }

  verifyStorage(): void {
    for (let i = 0; i < this.storage_.length; i++) {
      const key = this.storage_.key(i);

      if (!Object.values(StorageKey).includes(key as StorageKey)) {
        // Delete any keys that are not in the StorageKey enum
        this.storage_.removeItem(key as string);
      }
    }
  }

  getItem(key: string): string | null {
    if (settingsManager.isBlockPersistence) {
      return null;
    }
    PersistenceManager.verifyKey_(key);

    const value = this.storage_.getItem(key);

    if (value === null) {
      return null;
    }

    return value;
  }

  checkIfEnabled(key: string, fallback: boolean | undefined): boolean | undefined {
    PersistenceManager.verifyKey_(key);

    const value = this.storage_.getItem(key);

    if (value === null) {
      return fallback;
    }

    return value === 'true';
  }

  saveItem(key: string, value: string): void {
    if (settingsManager.isBlockPersistence) {
      return;
    }

    if (value === null || typeof value === 'undefined') {
      this.removeItem(key);

      return;
    }

    PersistenceManager.verifyKey_(key);
    try {
      this.storage_.setItem(key, value);
    } catch {
      errorManagerInstance.debug(`Failed to save to local storage: ${key}=${value}`);
    }
  }

  clear(): void {
    for (const key of Object.values(StorageKey)) {
      this.storage_.removeItem(key);
    }
  }

  removeItem(key: string): void {
    PersistenceManager.verifyKey_(key);
    this.storage_.removeItem(key);
  }

  private static verifyKey_(key: string) {
    if (!Object.values(StorageKey).includes(key as StorageKey)) {
      throw new Error(`Invalid key: ${key}`);
    }
  }
}
