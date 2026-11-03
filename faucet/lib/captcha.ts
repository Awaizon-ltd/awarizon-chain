export async function verifyCaptcha(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  if (!token) return false

  const secret = process.env.RECAPTCHA_SECRET_KEY
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY not set')
    return false
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  })

  try {
    const res = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )
    const data = await res.json()
    return data.success === true
  } catch {
    return false
  }
}
