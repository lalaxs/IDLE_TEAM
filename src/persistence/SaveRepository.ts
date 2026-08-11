import { createDefaultSave, repairSaveData, type SaveDataV1 } from "./schema";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SAVE_KEY = "idle-rpg-save-v1";

export class SaveRepository {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: SaveDataV1 | null = null;
  readonly persistent: boolean;

  constructor(private storage: StorageLike | null = typeof localStorage === "undefined" ? null : localStorage) {
    this.persistent = storage !== null;
  }

  load(): SaveDataV1 {
    if (!this.storage) return createDefaultSave();
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    try {
      return repairSaveData(JSON.parse(raw));
    } catch {
      try {
        this.storage.setItem(`idle-rpg-save-corrupt-${Date.now()}`, raw);
      } catch {
        // The in-memory default remains playable even when backup fails.
      }
      return createDefaultSave();
    }
  }

  schedule(save: SaveDataV1): void {
    this.pending = save;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 500);
  }

  flush(): boolean {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.pending || !this.storage) return false;
    try {
      this.pending.updatedAt = Date.now();
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.pending));
      this.pending = null;
      return true;
    } catch {
      return false;
    }
  }

  clear(): SaveDataV1 {
    this.storage?.removeItem(SAVE_KEY);
    this.pending = null;
    return createDefaultSave();
  }
}
