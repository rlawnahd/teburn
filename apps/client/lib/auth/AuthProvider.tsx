'use client';

import { createContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AuthUser, fetchCurrentUser, logout as logoutApi } from '@/lib/api/auth';

export interface AuthContextType {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isLoading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    logout: async () => {},
    refreshUser: async () => {},
});

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const u = await fetchCurrentUser();
            setUser(u);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, [refreshUser]);

    const logout = useCallback(async () => {
        await logoutApi();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoggedIn: !!user, isLoading, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
