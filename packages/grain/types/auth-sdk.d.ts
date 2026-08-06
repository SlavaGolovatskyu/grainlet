import type {
  AuthClient,
  AuthError,
  AuthProviderConfig,
  AuthSession,
  RefreshContext,
} from './auth.js';

export interface AuthSdkErrorOptions {
  code?: string;
  status?: number;
  recoverable?: boolean;
  details?: unknown;
  cause?: unknown;
}

export declare class AuthSdkError extends AuthError {
  code: string;
  status?: number;
  details?: unknown;
  constructor(message: string, options?: AuthSdkErrorOptions);
}

export interface GoogleSdkConfig {
  clientId: string;
  autoSelect?: boolean;
  cancelOnTapOutside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itpSupport?: boolean;
  nonce?: string;
  hostedDomain?: string;
  scriptUrl?: string;
  timeoutMs?: number;
}

export interface AppleSdkConfig {
  clientId: string;
  redirectURI: string;
  scope?: string;
  state?: string;
  nonce?: string;
  scriptUrl?: string;
  timeoutMs?: number;
}

export interface GitHubSdkConfig {
  clientId: string;
  redirectUri: string;
  scope?: string;
  authorizeUrl?: string;
  allowSignup?: boolean;
  popupName?: string;
  popupWidth?: number;
  popupHeight?: number;
  timeoutMs?: number;
}

export interface AuthSdkEndpoints {
  google?: string;
  apple?: string;
  github?: string;
  refresh?: string;
}

export interface AuthSdkConfig {
  baseUrl?: string;
  endpoints?: AuthSdkEndpoints;
  google?: GoogleSdkConfig;
  apple?: AppleSdkConfig;
  github?: GitHubSdkConfig;
  fetch?: typeof fetch;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export interface GoogleSignInInput {
  idToken?: string;
  nonce?: string;
  loginHint?: string;
  hostedDomain?: string;
  timeoutMs?: number;
}

export interface AppleSignInInput {
  idToken?: string;
  user?: unknown;
  state?: string;
  nonce?: string;
}

export interface AppleCredential {
  idToken: string;
  user?: unknown;
}

export interface GitHubSignInInput {
  code?: string;
  state?: string;
  redirectUri?: string;
  scope?: string;
  login?: string;
  timeoutMs?: number;
}

export interface GitHubAuthorization {
  code: string;
  state: string;
  redirectUri: string;
}

export interface AuthSdkClient<
  Session extends AuthSession = AuthSession,
> {
  config: {
    google?: GoogleSdkConfig;
    apple?: AppleSdkConfig;
    github?: GitHubSdkConfig;
  };
  endpoints: Required<AuthSdkEndpoints>;
  exchange(
    provider: 'google' | 'apple' | 'github' | string,
    payload: Record<string, unknown>
  ): Promise<Session>;
  refresh(context: RefreshContext<Session>): Promise<Partial<Session>>;
  signInGoogle(
    auth: AuthClient<Session>,
    input?: GoogleSignInInput
  ): Promise<Session>;
  signInApple(
    auth: AuthClient<Session>,
    input?: AppleSignInInput
  ): Promise<Session>;
  signInGitHub(
    auth: AuthClient<Session>,
    input?: GitHubSignInInput
  ): Promise<Session>;
}

export interface SignInProviderOptions {
  id?: string;
  name?: string;
}

export interface ScriptLoadOptions {
  id?: string;
  timeoutMs?: number;
}

export interface PopupOptions {
  name?: string;
  width?: number;
  height?: number;
}

export interface PopupMessageOptions {
  popup: Window;
  state: string;
  origin: string;
  type: string;
  timeoutMs?: number;
}

export interface OAuthCallbackMessage {
  type: string;
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

export declare function createAuthSdk<
  Session extends AuthSession = AuthSession,
>(config?: AuthSdkConfig): AuthSdkClient<Session>;

export declare function GoogleSignIn<
  Session extends AuthSession = AuthSession,
>(
  sdk: AuthSdkClient<Session>,
  options?: SignInProviderOptions
): AuthProviderConfig<Session, GoogleSignInInput | string>;

export declare function AppleSignIn<
  Session extends AuthSession = AuthSession,
>(
  sdk: AuthSdkClient<Session>,
  options?: SignInProviderOptions
): AuthProviderConfig<Session, AppleSignInInput | string>;

export declare function GitHubSignIn<
  Session extends AuthSession = AuthSession,
>(
  sdk: AuthSdkClient<Session>,
  options?: SignInProviderOptions
): AuthProviderConfig<Session, GitHubSignInInput>;

export declare function getGoogleIdToken(
  config: GoogleSdkConfig,
  input?: GoogleSignInInput
): Promise<string>;
export declare function getAppleCredential(
  config: AppleSdkConfig,
  input?: AppleSignInInput
): Promise<AppleCredential>;
export declare function getGitHubAuthorization(
  config: GitHubSdkConfig,
  input?: GitHubSignInInput
): Promise<GitHubAuthorization>;

export declare const GITHUB_CALLBACK_MESSAGE: string;
export declare function completeGitHubSignIn(options?: {
  targetOrigin?: string;
  close?: boolean;
}): OAuthCallbackMessage;

export declare function loadScript(
  src: string,
  options?: ScriptLoadOptions
): Promise<HTMLScriptElement>;
export declare function createOAuthState(): string;
export declare function openCenteredPopup(
  url: string,
  options?: PopupOptions
): Window;
export declare function waitForPopupMessage(
  options: PopupMessageOptions
): Promise<OAuthCallbackMessage>;
