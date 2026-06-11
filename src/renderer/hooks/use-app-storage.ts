import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { AppStorageKey } from 'shared/types'

export function getStorageQueryKey(key: AppStorageKey) {
  return ['app-storage', key] as const
}

export function useStoredValue<T>(key: AppStorageKey) {
  return useQuery({
    queryKey: getStorageQueryKey(key),
    queryFn: () => window.App.getStorageValue<T>(key),
  })
}

export function useSetStoredValue<T>(key: AppStorageKey) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (value: T) => window.App.setStorageValue(key, value),
    onSuccess: (_data, value) => {
      queryClient.setQueryData(getStorageQueryKey(key), value)
    },
  })

  return mutation.mutateAsync
}

export function useRemoveStoredValue(key: AppStorageKey) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => window.App.removeStorageValue(key),
    onSuccess: () => {
      queryClient.setQueryData(getStorageQueryKey(key), null)
    },
  })

  return mutation.mutateAsync
}

export function useClearStoredValues() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => window.App.clearStorage(),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['app-storage'] })
    },
  })
}
