import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
    provider: 'kakao' | 'google';
}

export const fetchCurrentUser = async (): Promise<AuthUser | null> => {
    const { data } = await axios.get<{ success: boolean; data: AuthUser | null }>(
        `${API_URL}/auth/me`,
        { withCredentials: true }
    );
    return data.data;
};

export const logout = async (): Promise<void> => {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
};

export const getLoginUrl = (provider: 'kakao' | 'google'): string => {
    return `${API_URL}/auth/${provider}`;
};
