import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getProfile,
  getSession,
  loginWithGoogle,
  loginWithPassword,
  logout as logoutService,
  signupWithPassword,
  updateProfile as updateProfileService,
} from "../services/authService";
import { AuthContext } from "./authStore";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const session = await getSession();
      setUser(session);
      if (session) {
        const p = await getProfile();
        setProfile(p);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const session = await loginWithPassword({ email, password });
    setUser(session);
    const p = await getProfile();
    setProfile(p);
    return { session, profile: p };
  }, []);

  const signup = useCallback(
    async ({ fullName, email, password, phone, role }) => {
      const result = await signupWithPassword({
        fullName,
        email,
        password,
        phone,
        role,
      });
      if (!result.hasSession || !result.user) {
        setUser(null);
        setProfile(null);
        return result;
      }

      setUser(result.user);
      const p = await getProfile();
      setProfile(p);
      return { ...result, profile: p };
    },
    [],
  );

  const googleLogin = useCallback(async () => {
    // Triggers a full-page redirect to backend OAuth.
    await loginWithGoogle();
  }, []);

  const updateProfile = useCallback(async (nextProfile) => {
    const saved = await updateProfileService(nextProfile);
    setProfile(saved);
    return saved;
  }, []);

  const logout = useCallback(async () => {
    await logoutService();
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      login,
      signup,
      googleLogin,
      logout,
      updateProfile,
      refresh,
    }),
    [
      user,
      profile,
      loading,
      login,
      signup,
      googleLogin,
      logout,
      updateProfile,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
