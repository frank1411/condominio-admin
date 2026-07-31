import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { supabase, clearSupabaseSession } from "@/_core/supabase";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false } = options ?? {};
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      // 1. Cerrar la sesión de Supabase (revoca refresh token y borra la sesión).
      //    Si la revocación remota falla por red, aún así continuamos.
      await supabase.auth.signOut();
    } catch {
      // Fallo de red durante la revocación: la limpieza local de abajo lo cubre.
    }

    // 2. Borrado local garantizado: elimina la clave sb-<projectRef>-auth-token
    //    de localStorage. Sin esto, getSupabaseAccessToken() seguiría devolviendo
    //    el token anterior y el usuario volvería a ser autenticado al recargar.
    clearSupabaseSession();

    try {
      // 3. Notificar al servidor para limpiar la cookie de sesión httpOnly
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;

    window.location.href = "/login";
  }, [redirectOnUnauthenticated, logoutMutation.isPending, meQuery.isLoading, state.user]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
