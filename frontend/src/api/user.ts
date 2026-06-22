import type { User, UserDashboardStats } from "../types";
import { apiClient } from "./_api";

export type { UserDashboardStats };

export type LanguageOption = {
  id: number;
  name: string;
};

export async function getDashboardStats(): Promise<UserDashboardStats> {
  const { data } = await apiClient.get<UserDashboardStats>("/users/me/dashboard-stats");
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/users/me");
  return data;
}

export async function getLanguageOptions(): Promise<LanguageOption[]> {
  const { data } = await apiClient.get<LanguageOption[]>("/users/me/language-options");
  return data;
}

export async function updateCurrentUser(input: {
  userName: string;
  email: string;
  primaryLanguageId?: number | null;
  learningLanguageId?: number | null;
}): Promise<User> {
  const { data } = await apiClient.patch<User>("/users/me", input);
  return data;
}

export async function deleteCurrentUser(): Promise<void> {
  await apiClient.delete("/users/me");
}
