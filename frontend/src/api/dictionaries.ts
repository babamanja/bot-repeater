import { apiClient } from "./_api";

export type UserDictionary = {
  id: number;
  name: string;
  creatorId: number;
  creatorName: string;
  isDefault: boolean;
  isOwner: boolean;
  entryCount: number;
  createdAt: string;
};

export async function getMyDictionaries(): Promise<UserDictionary[]> {
  const { data } = await apiClient.get<{ items: UserDictionary[] }>("/users/me/dictionaries");
  return data.items;
}
