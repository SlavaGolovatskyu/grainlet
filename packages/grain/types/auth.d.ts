import type { JSX } from '../jsx-runtime.js';
import type { Accessor } from './signals.js';

export type MaybePromise<T> = T | Promise<T>;
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface AuthSession<User extends AuthUser = AuthUser> {
  user: User;
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  isNewUser?: boolean;
  [key: string]: unknown;
}

export interface AuthStorage<Session = AuthSession> {
  getSession: () => MaybePromise<Session | null>;
  setSession: (session: Session) => MaybePromise<void>;
  clearSession: () => MaybePromise<void>;
}

export interface AuthErrorOptions {
  code?: string;
  status?: number;
  recoverable?: boolean;
  cause?: unknown;
}

export declare class AuthError extends Error {
  code: string;
  status?: number;
  recoverable?: boolean;
  constructor(message: string, options?: AuthErrorOptions);
}

export interface ProviderContext<
  Session extends AuthSession = AuthSession,
> {
  auth: AuthClient<Session>;
  provider: AuthProviderConfig<Session>;
}

export interface AuthProviderConfig<
  Session extends AuthSession = AuthSession,
  Input = unknown,
> {
  id: string;
  name: string;
  type: 'credentials' | 'oauth' | string;
  authorize: (
    input: Input,
    context: ProviderContext<Session>
  ) => MaybePromise<Session | null>;
}

export interface CredentialField {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  [key: string]: unknown;
}

export interface CredentialsConfig<
  Session extends AuthSession = AuthSession,
  Input = Record<string, unknown>,
> {
  id?: string;
  name?: string;
  credentials?: Record<string, CredentialField>;
  authorize: (
    credentials: Input,
    context: ProviderContext<Session>
  ) => MaybePromise<Session | null>;
}

export interface GoogleInput {
  idToken?: string;
  [key: string]: unknown;
}

export interface GoogleConfig<
  Session extends AuthSession = AuthSession,
  Input extends GoogleInput = GoogleInput,
> {
  id?: string;
  name?: string;
  getIdToken?: (
    input: Input,
    context: ProviderContext<Session>
  ) => MaybePromise<string | null | undefined>;
  authorize: (
    input: Input & { idToken: string },
    context: ProviderContext<Session>
  ) => MaybePromise<Session | null>;
}

export interface RefreshContext<Session extends AuthSession = AuthSession> {
  session: Session;
  refreshToken: string;
  userId?: string;
}

export interface AuthConfig<Session extends AuthSession = AuthSession> {
  providers?: AuthProviderConfig<Session, any>[];
  storage?: AuthStorage<Session>;
  refresh?: (
    context: RefreshContext<Session>
  ) => MaybePromise<Partial<Session>>;
  onSession?: (session: Session) => void;
  onSignOut?: (session: Session | null) => MaybePromise<void>;
  onError?: (error: AuthError) => void;
  isRefreshErrorNonRecoverable?: (error: AuthError) => boolean;
  autoRefresh?: boolean;
  maxRefreshErrors?: number;
  retryRefreshAfterMs?: number;
  accessTokenExpiryFallbackMs?: number;
  accessTokenExpirySafetyBufferMs?: number;
  now?: () => number;
}

export interface GetSessionOptions {
  forceRefresh?: boolean;
}

export interface RefreshOptions {
  force?: boolean;
}

export interface AuthClient<Session extends AuthSession = AuthSession> {
  data: Accessor<Session | null>;
  status: Accessor<AuthStatus>;
  error: Accessor<AuthError | null>;
  providers: Accessor<AuthProviderConfig<Session, any>[]>;
  initialize: () => Promise<Session | null>;
  getSession: (options?: GetSessionOptions) => Promise<Session | null>;
  signIn: (provider: string, input?: unknown) => Promise<Session>;
  signOut: () => Promise<void>;
  refresh: (options?: RefreshOptions) => Promise<Session | null>;
  update: (
    patch:
      | Partial<Session>
      | ((
          session: Session
        ) => MaybePromise<Partial<Session> | null | undefined>)
  ) => Promise<Session | null>;
  dispose: () => void;
}

export interface AuthProviderProps<
  Session extends AuthSession = AuthSession,
> {
  client?: AuthClient<Session>;
  config?: AuthConfig<Session>;
  children?:
    | JSX.Element
    | ((auth: AuthClient<Session>) => JSX.Element);
}

export interface ProtectedRouteProps<
  Session extends AuthSession = AuthSession,
> {
  client?: AuthClient<Session>;
  children?: JSX.Element | ((session: Session) => JSX.Element);
  fallback?: JSX.Element;
  loadingFallback?: JSX.Element;
  unauthenticatedFallback?: JSX.Element;
  redirectTo?: string | false;
  preserveCallback?: boolean;
  callbackParam?: string;
  replace?: boolean;
  basename?: string;
}

export interface LocalStorageAdapterOptions {
  key?: string;
  getStorage?: () => Storage | null;
}

export interface AccessTokenExpiryOptions {
  now?: () => number;
  fallbackMs?: number;
  safetyBufferMs?: number;
}

export declare function createAuth<
  Session extends AuthSession = AuthSession,
>(config?: AuthConfig<Session>): AuthClient<Session>;

export declare function Credentials<
  Session extends AuthSession = AuthSession,
  Input = Record<string, unknown>,
>(
  config: CredentialsConfig<Session, Input>
): AuthProviderConfig<Session, Input>;

export declare function Google<
  Session extends AuthSession = AuthSession,
  Input extends GoogleInput = GoogleInput,
>(
  config: GoogleConfig<Session, Input>
): AuthProviderConfig<Session, Input | string>;

export declare function createMemoryStorage<
  Session extends AuthSession = AuthSession,
>(initialSession?: Session | null): AuthStorage<Session>;

export declare function createLocalStorageAdapter<
  Session extends AuthSession = AuthSession,
>(options?: LocalStorageAdapterOptions): AuthStorage<Session>;

export declare function AuthProvider<
  Session extends AuthSession = AuthSession,
>(props: AuthProviderProps<Session>): any;

export declare function ProtectedRoute<
  Session extends AuthSession = AuthSession,
>(props: ProtectedRouteProps<Session>): any;

export declare function useSession<
  Session extends AuthSession = AuthSession,
>(): AuthClient<Session>;

export declare const AuthContext: any;

export declare const ACCESS_TOKEN_EXPIRY_FALLBACK_MS: number;
export declare const ACCESS_TOKEN_EXPIRY_SAFETY_BUFFER_MS: number;
export declare function decodeJwtPayload(
  token: string
): Record<string, unknown> | null;
export declare function getAccessTokenExpiry(
  accessToken: string,
  options?: AccessTokenExpiryOptions
): number;
