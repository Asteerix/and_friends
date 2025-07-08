import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NetworkError {
  message: string;
  timestamp: number;
  retryAction?: () => Promise<void>;
}

interface NetworkErrorContextType {
  showNetworkError: (error: NetworkError) => void;
  hideNetworkError: () => void;
  currentError: NetworkError | null;
}

const NetworkErrorContext = createContext<NetworkErrorContextType | undefined>(undefined);

export const useNetworkError = () => {
  const context = useContext(NetworkErrorContext);
  if (!context) {
    throw new Error('useNetworkError must be used within NetworkErrorProvider');
  }
  return context;
};

interface NetworkErrorProviderProps {
  children: ReactNode;
}

export const NetworkErrorProvider: React.FC<NetworkErrorProviderProps> = ({ children }) => {
  const [currentError, setCurrentError] = useState<NetworkError | null>(null);

  const showNetworkError = useCallback((error: NetworkError) => {
    setCurrentError(error);
  }, []);

  const hideNetworkError = useCallback(() => {
    setCurrentError(null);
  }, []);

  return (
    <NetworkErrorContext.Provider value={{ showNetworkError, hideNetworkError, currentError }}>
      {children}
    </NetworkErrorContext.Provider>
  );
};