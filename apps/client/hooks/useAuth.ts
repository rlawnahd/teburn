'use client';

import { useContext } from 'react';
import { AuthContext, AuthContextType } from '@/lib/auth/AuthProvider';

export function useAuth(): AuthContextType {
    return useContext(AuthContext);
}
