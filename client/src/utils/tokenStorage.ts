// The access token lives in localStorage when the user ticks "Remember me"
// (survives browser restarts) and in sessionStorage otherwise (cleared when
// the browser closes). Every read/write goes through here so callers don't
// need to know which one is in use.
const TOKEN_KEY = 'token';
const LEGACY_REFRESH_KEY = 'refreshToken';

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  },

  set(token: string, remember: boolean) {
    this.clear();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  },

  clear() {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem(TOKEN_KEY);
      store.removeItem(LEGACY_REFRESH_KEY);
    }
  },
};
