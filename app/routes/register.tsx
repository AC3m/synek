import { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useAuth } from '~/lib/context/AuthContext'
import { supabase, isMockMode } from '~/lib/supabase'
import { mockRegisterUser, mockLogin } from '~/lib/auth'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import { LandingNav } from '~/components/landing/LandingNav'
import type { UserRole } from '~/lib/auth'

export function meta() {
  return [{ title: 'Register — Synek' }]
}

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
})

export default function RegisterPage() {
  const { t } = useTranslation('landing')
  const { login } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<UserRole | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (honeypot) return

    if (!role) {
      setError(t('beta.selectRole'))
      return
    }

    const result = registerSchema.safeParse({ name: name.trim(), email: email.trim(), password })
    if (!result.success) {
      const errs: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const field = String(issue.path[0])
        errs[field] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setFieldErrors({})
    setError(null)
    setIsPending(true)

    try {
      if (isMockMode) {
        const registered = mockRegisterUser(
          result.data.email,
          result.data.password,
          result.data.name,
          role
        )
        await mockLogin(registered.email, result.data.password)
        await login(registered.email, result.data.password)
      } else {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              name: result.data.name,
              email: result.data.email,
              password: result.data.password,
              role,
            }),
          }
        )
        const payload = await res.json() as { success?: boolean; error?: string }

        if (!res.ok) {
          if (payload.error === 'email_taken') {
            setFieldErrors({ email: t('beta.emailAlreadyRegistered') })
            setIsPending(false)
            return
          }
          throw new Error(payload.error ?? 'internal_error')
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        })
        if (signInError) throw signInError
      }

      const locale = localStorage.getItem('locale') ?? 'pl'
      navigate(`/${locale}/${role}`, { replace: true })
    } catch {
      setError(t('beta.selectRole'))
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main className="flex min-h-screen items-center justify-center px-4 pt-14">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <span className="mb-3 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {t('beta.badge')}
            </span>
            <h1 className="text-2xl font-bold tracking-tight">{t('beta.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('beta.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-background p-6 shadow-sm sm:p-8">
            {/* Beta note */}
            <p className="rounded-lg bg-primary/5 p-3 text-sm text-muted-foreground">
              {t('beta.betaNote')}
            </p>

            {/* Role picker */}
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('beta.roleLabel')}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['coach', 'athlete'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                      role === r
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-muted'
                    )}
                  >
                    {t(r === 'coach' ? 'beta.roleCoach' : 'beta.roleAthlete')}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label htmlFor="reg-name" className="text-sm font-medium">
                {t('beta.name')}
              </label>
              <Input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="reg-email" className="text-sm font-medium">
                {t('beta.email')}
              </label>
              <Input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="reg-password" className="text-sm font-medium">
                {t('beta.password')}
              </label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('beta.passwordHint')}</p>
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Honeypot */}
            <input
              name="website"
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isPending || !role}>
              {isPending ? '…' : t('beta.submit')}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {t('beta.alreadyHaveAccount')}{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t('beta.alreadyHaveAccountCta')}
              </Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
