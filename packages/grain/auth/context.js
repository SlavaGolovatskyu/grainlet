import { createContext, useContext } from '../index.js';

export const AuthContext = createContext(null);

export function useSession() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error(
      'useSession: no AuthProvider found. Wrap your tree in <AuthProvider>.'
    );
  }
  return auth;
}
