import { Response } from 'express'

type SameSiteOption = 'none' | 'lax' | 'strict'

const baseOpts = (isProd: boolean) => {
  const sameSite: SameSiteOption = isProd ? 'none' : 'lax'
  const secure = !!isProd

  // NOTE: Removed domain setting to avoid "option domain is invalid" errors
  // Cookies will work for the specific host without cross-subdomain sharing

  return {
    path: '/',
    sameSite,
    secure,
  }
}

export function setSecureCookie(
  res: Response,
  name: string,
  value: string,
  isProd: boolean,
  isPublic: boolean, // true => readable by JS (XSRF), false => HttpOnly
) {
  const opts: any = {
    ...baseOpts(isProd),
    httpOnly: !isPublic,
    // Partitioned cookies (CHIPS) help with third-party cookie blocking in Chromium
    // Only enable for auth HttpOnly cookies in production. Do NOT partition public XSRF cookie.
    ...(isProd && !isPublic ? { partitioned: true } : {}),
  }

  console.log(`🍪 SETEAR COOKIE ${name} - opts:`, {
    isProd,
    isPublic,
    opts,
    valueLength: value?.length,
  })

  // If running in production and cookie should be partitioned, some cookie libraries
  // may not emit the `Partitioned` token. Build and append the header manually
  // to ensure the browser receives `Partitioned` for HttpOnly auth cookies.
  if (isProd && !isPublic) {
    const parts: string[] = []
    parts.push(`${name}=${value}`)
    parts.push(`Path=${opts.path || '/'}`)
    if (opts.httpOnly) parts.push('HttpOnly')
    if (opts.secure) parts.push('Secure')
    if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
    // Add Partitioned token
    parts.push('Partitioned')

    const headerValue = parts.join('; ')
    // Append the header so existing Set-Cookie behavior isn't lost (some frameworks
    // add multiple Set-Cookie headers). Browsers will store the cookie with Partitioned.
    res.append('Set-Cookie', headerValue)
  } else {
    res.cookie(name, value, opts)
  }
}

export function clearSecureCookie(
  res: Response,
  name: string,
  isProd: boolean,
) {
  const opts: any = {
    ...baseOpts(isProd),
    httpOnly: true,
  }

  console.log(`🍪 Limpiando cookie HttpOnly: ${name}, opciones:`, opts)

  // If partitioned in production, set an expired Set-Cookie with Partitioned token
  if (isProd) {
    const parts: string[] = []
    parts.push(`${name}=`)
    parts.push(`Path=${opts.path || '/'}`)
    parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    parts.push('Max-Age=0')
    if (opts.httpOnly) parts.push('HttpOnly')
    if (opts.secure) parts.push('Secure')
    if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`)
    parts.push('Partitioned')

    res.append('Set-Cookie', parts.join('; '))
  } else {
    res.clearCookie(name, opts)
  }
}

export function clearPublicCookie(
  res: Response,
  name: string,
  isProd: boolean,
) {
  const opts: any = {
    ...baseOpts(isProd),
    httpOnly: false,
  }

  console.log(`🍪 Limpiando cookie pública: ${name}, opciones:`, opts)
  res.clearCookie(name, opts)
}
