import { IdToken } from './global';
import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

interface CacheKeyData {
  audience: string;
  scope: string;
  client_id: string;
}

interface DecodedToken {
  claims: IdToken;
  user: any;
}

interface CacheEntry {
  id_token: string;
  access_token: string;
  expires_in: number;
  decodedToken: DecodedToken;
  audience: string;
  scope: string;
  client_id: string;
  refresh_token?: string;
}

export interface ICache {
  save(entry: CacheEntry): Promise<void>;

  get(
    key: CacheKeyData,
    expiryAdjustmentSeconds?: number
  ): Promise<Partial<CacheEntry>>;

  clear(): Promise<void>;
}

const keyPrefix = '@@auth0spajs@@';
const DEFAULT_EXPIRY_ADJUSTMENT_SECONDS = 0;

const createKey = (e: CacheKeyData) =>
  `${keyPrefix}::${e.client_id}::${e.audience}::${e.scope}`;

type CachePayload = {
  body: Partial<CacheEntry>;
  expiresAt: number;
};

/**
 * Wraps the specified cache entry and returns the payload
 * @param entry The cache entry to wrap
 */
const wrapCacheEntry = (entry: CacheEntry): CachePayload => {
  const expiresInTime = Math.floor(Date.now() / 1000) + entry.expires_in;
  const expirySeconds = Math.min(expiresInTime, entry.decodedToken.claims.exp);

  return {
    body: entry,
    expiresAt: expirySeconds
  };
};

export class IonicStorage implements ICache {
  public async save(entry: CacheEntry): Promise<void> {
    const cacheKey = createKey(entry);
    const payload = wrapCacheEntry(entry);

    await Storage.set({ key: cacheKey, value: JSON.stringify(payload) });
  }

  public async get(
    key: CacheKeyData,
    expiryAdjustmentSeconds = DEFAULT_EXPIRY_ADJUSTMENT_SECONDS
  ): Promise<Partial<CacheEntry>> {
    const cacheKey = createKey(key);
    const payload = await this.readJson(cacheKey);
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (!payload) return;

    if (payload.expiresAt - expiryAdjustmentSeconds < nowSeconds) {
      if (payload.body.refresh_token) {
        const newPayload = this.stripData(payload);
        await this.writeJson(cacheKey, newPayload);

        return newPayload.body;
      }

      await Storage.remove({ key: cacheKey });
      return;
    }

    return payload.body;
  }

  public async clear() {
    const storage = await Storage.keys();
    storage.keys.forEach(key => {
      if (key.startsWith(keyPrefix)) {
        Storage.remove({ key });
      }
    });
  }

  /**
   * Retrieves data from local storage and parses it into the correct format
   * @param cacheKey The cache key
   */
  private async readJson(cacheKey: string): Promise<CachePayload> {
    const storage = await Storage.get({ key: cacheKey });

    if (!storage || !storage.value) {
      return;
    }

    return JSON.parse(storage.value);
  }

  /**
   * Writes the payload as JSON to localstorage
   * @param cacheKey The cache key
   * @param payload The payload to write as JSON
   */
  private async writeJson(cacheKey: string, payload: CachePayload) {
    await Storage.set({ key: cacheKey, value: JSON.stringify(payload) });
  }

  /**
   * Produce a copy of the payload with everything removed except the refresh token
   * @param payload The payload
   */
  private stripData(payload: CachePayload): CachePayload {
    const { refresh_token } = payload.body;

    const strippedPayload: CachePayload = {
      body: { refresh_token: refresh_token },
      expiresAt: payload.expiresAt
    };

    return strippedPayload;
  }
}
