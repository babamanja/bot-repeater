import { apiClient } from "./_api";
import type { PaginatedResponse, PaginationMeta } from "./admin";

export type UserWord = {
  vocabPairId: number;
  dictionaryId: number;
  dictionaryName: string;
  primaryWord: string;
  learningWord: string;
  pimsleurLevel: number;
  nextReviewMs: string;
};

export type VocabLanguages = {
  primaryName: string;
  learningName: string;
};

export type WordSuggestion = {
  pairId: number;
  learningText: string;
};

export type PrimaryWordLookup = {
  primaryWordId: number;
  primaryText: string;
  suggestions: WordSuggestion[];
  learningLangName: string;
};

export type AddedWord = {
  vocabPairId: number;
  primaryWord: string;
  learningWord: string;
};

export type UserWordsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: "nextReviewMs" | "pimsleurLevel" | "primaryWord";
  sortOrder?: "asc" | "desc";
};

export type { PaginationMeta };

export async function getMyWords(
  query: UserWordsQuery = {},
): Promise<PaginatedResponse<UserWord>> {
  const { data } = await apiClient.get<PaginatedResponse<UserWord>>("/users/me/words", {
    params: query,
  });
  return data;
}

export async function getVocabLanguages(): Promise<VocabLanguages> {
  const { data } = await apiClient.get<VocabLanguages>("/users/me/vocab-languages");
  return data;
}

export async function lookupPrimaryWord(primaryWord: string): Promise<PrimaryWordLookup> {
  const { data } = await apiClient.post<PrimaryWordLookup>("/users/me/words/lookup-primary", {
    primaryWord,
  });
  return data;
}

export async function addMyWord(
  input:
    | { vocabPairId: number }
    | { primaryWordId: number; learningWord: string },
): Promise<AddedWord> {
  const { data } = await apiClient.post<AddedWord>("/users/me/words", input);
  return data;
}
