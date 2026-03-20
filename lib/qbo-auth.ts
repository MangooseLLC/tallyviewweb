const AUTHORIZATION_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

const LOCAL_DEFAULT_REDIRECT = 'http://localhost:3000/api/qbo/callback';

/**
 * URL Intuit redirects to after OAuth. Must match a Redirect URI on the app's Keys tab
 * exactly (scheme, host, port, path; typically no trailing slash).
 *
 * Priority: QBO_REDIRECT_URI → NEXT_PUBLIC_APP_URL + /api/qbo/callback → https://VERCEL_URL/... → localhost (dev only).
 */
export function getQboRedirectUri(): string {
  const explicit = process.env.QBO_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const appBase = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (appBase) return `${appBase}/api/qbo/callback`;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '').split('/')[0]?.replace(/\/$/, '') ?? vercel;
    return `https://${host}/api/qbo/callback`;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Set QBO_REDIRECT_URI (or NEXT_PUBLIC_APP_URL) to your public callback URL, e.g. https://yourdomain.com/api/qbo/callback. It must match Intuit Developer Portal → Your app → Keys → Redirect URIs exactly.',
    );
  }

  return LOCAL_DEFAULT_REDIRECT;
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    redirect_uri: getQboRedirectUri(),
    scope: 'com.intuit.quickbooks.accounting',
    response_type: 'code',
    state,
  });
  return `${AUTHORIZATION_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getQboRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
  }>;
}

export async function refreshAccessToken(refreshToken: string) {
  const basicAuth = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
    token_type: string;
  }>;
}
