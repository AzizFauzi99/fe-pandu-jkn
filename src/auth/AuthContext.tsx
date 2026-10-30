import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AUTH_EXPIRED_EVENT, api, clearToken, getToken, storeToken } from "../api/client";
import type { Profile, RegisterPayload } from "../api/types";
import { toProfileBody } from "../lib/profile";

interface AuthContextValue {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<Profile>;
  refreshProfile: () => Promise<Profile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken());
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getToken()));
  const profileRef = useRef<Profile | null>(null);

  const setProfile = useCallback((next: Profile | null) => {
    profileRef.current = next;
    setProfileState(next);
  }, []);

  /* muat profil saat aplikasi dibuka dengan token tersimpan */
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getProfile()
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setProfile]);

  /* token kedaluwarsa / ditolak server */
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setProfile(null);
      setLoading(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [setProfile]);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      const res = await api.login(email, password);
      storeToken(res.access_token, remember);
      setToken(res.access_token);
      setLoading(true);
      try {
        setProfile(await api.getProfile());
      } catch (err) {
        clearToken();
        setToken(null);
        setProfile(null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setProfile],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await api.register(payload);
      const res = await api.login(payload.email, payload.password);
      storeToken(res.access_token, true);
      setToken(res.access_token);
      setLoading(true);
      try {
        setProfile(await api.getProfile());
      } catch (err) {
        clearToken();
        setToken(null);
        setProfile(null);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setProfile],
  );

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      const current = profileRef.current;
      if (!current) throw new Error("Profil belum termuat. Muat ulang halaman.");
      const saved = await api.saveProfile(toProfileBody({ ...current, ...patch }));
      setProfile(saved);
      return saved;
    },
    [setProfile],
  );

  const refreshProfile = useCallback(async () => {
    const next = await api.getProfile();
    setProfile(next);
    return next;
  }, [setProfile]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* token mungkin sudah kedaluwarsa; tetap bersihkan sesi lokal */
    }
    clearToken();
    setProfile(null);
    setToken(null);
    setLoading(false);
  }, [setProfile]);

  const value = useMemo(
    () => ({ token, profile, loading, login, register, saveProfile, refreshProfile, logout }),
    [token, profile, loading, login, register, saveProfile, refreshProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
}
