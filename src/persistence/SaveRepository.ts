import { SAVE_VERSION, type SaveDataV1 } from "../domain/save/SaveData";
import { createDefaultSave, repairSaveData } from "./schema";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = "idle-rpg-save-v1";
export const SAVE_BACKUP_KEY = "idle-rpg-save-backup";

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isCurrentSave(value: unknown): value is { version: typeof SAVE_VERSION } {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as { version?: unknown }).version === SAVE_VERSION);
}

export class SaveRepository {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: SaveDataV1 | null = null;
  private storageHealthy: boolean;

  constructor(private storage: StorageLike | null = getDefaultStorage()) {
    this.storageHealthy = storage !== null;
  }

  get persistent(): boolean {
    return this.storageHealthy;
  }

  load(): SaveDataV1 {
    if (!this.storage) return createDefaultSave();
    let raw: string | null;
    try {
      raw = this.storage.getItem(SAVE_KEY);
      this.storageHealthy = true;
    } catch {
      this.storageHealthy = false;
      return createDefaultSave();
    }
    if (!raw) return createDefaultSave();
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isCurrentSave(parsed)) {
        this.backupInvalidSave(raw);
        return createDefaultSave();
      }
      return repairSaveData(parsed);
    } catch {
      this.backupInvalidSave(raw);
      return createDefaultSave();
    }
  }

  schedule(save: SaveDataV1): void {
    if (!this.storage) return;
    this.pending = save;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }

  saveNow(save: SaveDataV1): boolean {
    this.pending = save;
    return this.flush();
  }

  flush(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending || !this.storage) return false;
    const pending = this.pending;
    const savedAt = Date.now();
    try {
      const serialized = JSON.stringify({ ...pending, updatedAt: savedAt });
      this.storage.setItem(SAVE_KEY, serialized);
      pending.updatedAt = savedAt;
      this.pending = null;
      this.storageHealthy = true;
      return true;
    } catch {
      this.storageHealthy = false;
      return false;
    }
  }

  clear(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
    if (!this.storage) return true;

    let primaryCleared = true;
    let backupCleared = true;
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      primaryCleared = false;
      this.storageHealthy = false;
    }
    try {
      this.storage.removeItem(SAVE_BACKUP_KEY);
    } catch {
      backupCleared = false;
      this.storageHealthy = false;
    }
    if (primaryCleared && backupCleared) this.storageHealthy = true;
    return primaryCleared;
  }

  private backupInvalidSave(raw: string): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(SAVE_BACKUP_KEY, raw);
      this.storage.removeItem(SAVE_KEY);
      this.storageHealthy = true;
    } catch {
      this.storageHealthy = false;
    }
  }
}
