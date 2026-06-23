import localforage from 'localforage';

localforage.config({
  name: 'mockms_offline_cache',
  storeName: 'test_data'
});

export const cacheData = async (key: string, data: any) => {
  try {
    await localforage.setItem(key, data);
  } catch (err) {
    console.error('Error caching data:', err);
  }
};

export const getCachedData = async <T>(key: string): Promise<T | null> => {
  try {
    return await localforage.getItem<T>(key);
  } catch (err) {
    console.error('Error retrieving cached data:', err);
    return null;
  }
};

export const clearCache = async () => {
  try {
    await localforage.clear();
  } catch (err) {
    console.error('Error clearing cache:', err);
  }
};
