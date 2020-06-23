import { Plugins } from '@capacitor/core';

const { Storage } = Plugins;

export const getAllKeys = async () => (await Storage.keys()).keys;

export const get = async <T extends Object>(key: string) => {
  const storageSpace = await Storage.get({ key });
  if (typeof storageSpace === 'undefined') {
    return;
  }
  return <T>JSON.parse(storageSpace.value);
};
export const save = async (key: string, value: any) => {
  await Storage.set({ key, value: JSON.stringify(value) });
};
export const remove = async (key: string) => {
  await Storage.remove({ key });
};
