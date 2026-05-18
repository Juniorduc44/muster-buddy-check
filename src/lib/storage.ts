export function safeStorageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[storage] Failed to read localStorage key "${key}"`, error);
    return null;
  }
}

export function safeStorageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`[storage] Failed to write localStorage key "${key}"`, error);
    return false;
  }
}

export function safeStorageRemove(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`[storage] Failed to remove localStorage key "${key}"`, error);
    return false;
  }
}
