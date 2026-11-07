/*
  The access token lives only in memory, never in localStorage, so a script injected into the page cannot read it from storage.
  After a reload it is gone; the httpOnly refresh cookie gets a new one (see AuthService.restoreSession).
*/

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export const authToken = {
  get: () => accessToken,
  set: (token: string | null) => (accessToken = token),
};

// AuthService registers how to refresh; the axios interceptor only calls it (avoids a circular import)
export function setRefreshHandler(handler: () => Promise<string | null>): void {
  refreshHandler = handler;
}

export function refreshAccessToken(): Promise<string | null> {
  return refreshHandler ? refreshHandler() : Promise.resolve(null);
}
