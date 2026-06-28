'use client';
import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '../store/store';
import { logout, setCredentials, setLoading } from '../store/features/authSlice';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '../services/authService';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      if (!storeRef.current) return;
      try {
        const json = await authService.fetchMe();
        if (mounted) {
          storeRef.current.dispatch(setCredentials({ user: json.data.user }));
        }
      } catch (err) {
        if (mounted) {
          storeRef.current.dispatch(logout());
        }
      }
    };

    checkAuth();

    const handleUnauthorized = () => {
      if (storeRef.current) {
        storeRef.current.dispatch(logout());
        // Only redirect if not already on login or register
        if (pathname !== "/login" && pathname !== "/register") {
          router.push("/login");
        }
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [router, pathname]);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
