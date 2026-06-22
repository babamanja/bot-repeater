import * as dictionaryRepository from "../db/dictionaryRepository.js";

export async function listMyDictionaries(userId: number) {
  if (!Number.isInteger(userId) || userId < 1) {
    return { ok: false as const, status: 401, error: "unauthorized" };
  }

  const items = await dictionaryRepository.selectUserDictionaries(userId);
  return { ok: true as const, items };
}
