// src/proxy.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const isMfaEnrolled = factors?.all.some((f) => f.status === 'verified');

    // ✅ THE FIX: Explicitly await the assurance level check
    const mfaStatus = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const isMfaVerified = mfaStatus.data?.currentLevel === 'aal2';

    if (isMfaEnrolled && !isMfaVerified && url.pathname !== '/login/mfa') {
      url.pathname = '/login/mfa';
      return NextResponse.redirect(url);
    }

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
