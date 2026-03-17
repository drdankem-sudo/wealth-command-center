// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 1. Get the current user session
  const { data: { user } } = await supabase.auth.getUser();
  const url = request.nextUrl.clone();

  // 2. If no user and trying to access the dashboard, go to /login
  if (!user && url.pathname === '/') {
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 3. MFA LOGIC: Check if the user has 2FA verified
  if (user) {
    // List the 2FA factors for this user
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const isMfaEnrolled = factors?.all.some((f) => f.status === 'verified');

    // Get the "AAL" (Authenticator Assurance Level)
    // aal1 = password only | aal2 = password + 2FA code entered
    const { data: authData } = await supabase.auth.getAuthenticatorAssuranceLevel();
    const isMfaVerified = authData?.currentLevel === 'aal2';

    // If they have 2FA enabled but haven't entered the code (aal1), 
    // and they aren't already on the MFA page... bounce them to /login/mfa
    if (isMfaEnrolled && !isMfaVerified && url.pathname !== '/login/mfa') {
      url.pathname = '/login/mfa';
      return NextResponse.redirect(url);
    }

    // If they ARE fully verified (aal2) or don't have MFA, but try to go to /login,
    // send them to the dashboard
    if ((!isMfaEnrolled || isMfaVerified) && url.pathname === '/login') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/', '/login', '/login/mfa'],
};