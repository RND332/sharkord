import { createContext, useContext, type ReactNode } from 'react';
import { store, type IStore } from './store';

const StoreContext = createContext<IStore | null>(null);

// the store module reads this context back, so the client singleton cannot be
// the default value of the context itself: it would be read before the store
// module finished loading. the hook resolves it instead
export const useStore = (): IStore => {
  const contextStore = useContext(StoreContext);

  return contextStore ?? store;
};

export const StoreProvider = ({
  children,
  value
}: {
  children: ReactNode;
  value?: IStore;
}) => {
  return (
    <StoreContext.Provider value={value ?? store}>
      {children}
    </StoreContext.Provider>
  );
};
