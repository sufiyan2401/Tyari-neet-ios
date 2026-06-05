import api from '@/lib/api';
import { TApiPromise, TMutationOpts, TQueryOpts } from '@/types/api';
import { TUser } from '@/types/User';
import { useMutation, useQuery } from '@tanstack/react-query';

const getProfile = (): TApiPromise<TUser> => {
  return api.get('/api/v1/users/me', {
    // On expired/stale sessions, avoid retry storms and noisy logs in UI.
    skipRetry: true,
    suppressErrorLogging: true,
  });
};

const updateUser = (
  data: Partial<{
    id: string;
    name: string;
    bio: string;
    password: string;
    currentPassword: string;
    profilePicture: string | null;
  }>
): TApiPromise<TUser> => {
  return api.put(`/api/v1/users/${data.id}`, data, {
    // Avoid retry storm for user profile/password mutations.
    skipRetry: true,
  });
};

export const useGetProfile = (options?: TQueryOpts<TUser>) => {
  return useQuery({
    queryKey: ['useGetProfile'],
    queryFn: getProfile,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60 * 1000, // auto-refresh every 5 min for subscription changes
    ...options,
  });
};

export const useUpdateUser = (
  options?: TMutationOpts<
    Partial<{
      id: string;
      name: string;
      bio: string;
      password: string;
      currentPassword: string;
      profilePicture: string | null;
    }>,
    TUser
  >
) => {
  return useMutation({
    mutationKey: ['useUpdateUser'],
    mutationFn: (
      data: Partial<{
        id: string;
        name: string;
        bio: string;
        password: string;
        currentPassword: string;
        profilePicture: string | null;
      }>
    ) => updateUser(data),
    ...options,
  });
};
