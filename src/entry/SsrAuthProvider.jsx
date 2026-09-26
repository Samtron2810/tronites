import { AuthContext } from "../context/authContextObject";

// Server-render pass for public routes always renders as anonymous — the
// real AuthContext.jsx reads localStorage synchronously inside its
// useState initializer (readCachedUser), which throws under Node SSR
// (localStorage doesn't exist there). Patching the real provider to be
// SSR-safe would touch load-bearing logic used by the entire
// authenticated app for a code path (SSR) that only ever needs to render
// the logged-out view anyway: a real visitor's browser re-hydrates with
// the actual client AuthProvider immediately after, at which point their
// true session takes over exactly as it does today. This stand-in exists
// only so every component tree already written against useAuth() (Navbar
// suppression in App.jsx, PublicProfile's isOwnProfile check, etc.) gets
// a context shape it can safely destructure without special-casing SSR
// in each of them.
export const SsrAuthProvider = ({ children }) => (
  <AuthContext.Provider
    value={{
      user: null,
      loading: false,
      getMe: async () => null,
      register: async () => {},
      login: async () => {},
      logout: () => {},
      updateUser: () => {},
      registerNavigateToLogin: () => {},
    }}
  >
    {children}
  </AuthContext.Provider>
);
