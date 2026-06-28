'use client';
import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '../store/store';
import { loadAuth } from '../store/features/authSlice';
import { useEffect } from 'react';

export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>(null);
  if (!storeRef.current) {
    //Create store 
    storeRef.current = makeStore();
  }

  useEffect(() => {
    if (storeRef.current) {
      storeRef.current.dispatch(loadAuth());
    }
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
