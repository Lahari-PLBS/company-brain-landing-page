import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = request.method === 'GET'
    ? NextResponse.next({ request })
    : NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = request.method === 'GET'
            ? NextResponse.next({ request })
            : NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()

  if (url.pathname.startsWith('/workspace') && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (url.pathname.startsWith('/login') && user) {
    url.pathname = '/workspace'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
