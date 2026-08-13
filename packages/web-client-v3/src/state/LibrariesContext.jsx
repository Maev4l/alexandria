import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { librariesApi } from '@/api';

const LibrariesContext = createContext(null);

export const LibrariesProvider = ({ children }) => {
  const [libraries, setLibraries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const data = await librariesApi.list();
      setLibraries(data?.libraries ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    // The API returns owned and shared-with-me in one response; sharedFrom is the only
    // discriminator, and it is omitted rather than null on owned libraries.
    const owned = libraries.filter((library) => !library.sharedFrom);
    const sharedWithMe = libraries.filter((library) => Boolean(library.sharedFrom));
    return {
      libraries,
      owned,
      sharedWithMe,
      isLoading,
      error,
      refresh,
      byId: (id) => libraries.find((library) => library.id === id),
    };
  }, [libraries, isLoading, error, refresh]);

  return <LibrariesContext.Provider value={value}>{children}</LibrariesContext.Provider>;
};

export const useLibraries = () => {
  const value = useContext(LibrariesContext);
  if (!value) throw new Error('useLibraries must be used inside a LibrariesProvider');
  return value;
};
