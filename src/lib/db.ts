import { Media } from '@/types';

const DB_NAME = 'color-camera-db';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';

let db: IDBDatabase | null = null;

// 初始化数据库
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // 创建媒体存储
      if (!database.objectStoreNames.contains(MEDIA_STORE)) {
        const mediaStore = database.createObjectStore(MEDIA_STORE, {
          keyPath: 'id',
        });
        // 创建索引，按创建时间排序
        mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

// 保存媒体
export async function saveMedia(media: Media): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.add(media);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 获取所有媒体（按时间倒序）
export async function getAllMedia(): Promise<Media[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readonly');
    const store = transaction.objectStore(MEDIA_STORE);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev'); // 倒序
    const mediaList: Media[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBCursorWithValue).result;
      if (cursor) {
        mediaList.push(cursor.value);
        cursor.continue();
      } else {
        resolve(mediaList);
      }
    };
  });
}

// 根据 ID 获取媒体
export async function getMediaById(id: string): Promise<Media | undefined> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readonly');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// 删除媒体
export async function deleteMedia(id: string): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 清空所有媒体
export async function clearAllMedia(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readwrite');
    const store = transaction.objectStore(MEDIA_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}