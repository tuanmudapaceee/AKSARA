import {
  useState,
  type FormEvent,
} from 'react'

import aksaraLogo from './assets/aksara-logo.svg'


type LoginPageProps = {
  username: string
  password: string
  loading: boolean
  error: string
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  onSubmit: (event: FormEvent) => void
}


export default function LoginPage({
  username,
  password,
  loading,
  error,
  setUsername,
  setPassword,
  onSubmit,
}: LoginPageProps) {

  const [
    showPassword,
    setShowPassword,
  ] = useState(false)


  return (
    <div className="aks-login-v6">

      <div className="aks-login-v6-bg" />

      <main className="aks-login-v6-shell">

        <section className="aks-login-v6-info">

          <div className="aks-login-v6-brand">

            <img
              src={aksaraLogo}
              alt="AKSARA"
              className="aks-login-v6-brand-image"
            />

            <div className="aks-login-v6-brand-text">

              <strong>
                AKSARA
              </strong>

              <span>
                Privileged Access Management
              </span>

            </div>

          </div>


          <div className="aks-login-v6-hero">

            <div className="aks-login-v6-kicker">
              SECURE INFRASTRUCTURE ACCESS
            </div>

            <h1>
              Control privileged access
              to critical infrastructure.
            </h1>

            <p>
              Centralized secure access for
              SSH and RDP sessions with
              monitoring, permissions and
              complete audit trails.
            </p>

          </div>


          <div className="aks-login-v6-capabilities">

            <div>
              <span>01</span>

              <section>
                <strong>
                  Secure Remote Access
                </strong>

                <p>
                  Controlled SSH and RDP
                  connectivity.
                </p>
              </section>
            </div>


            <div>
              <span>02</span>

              <section>
                <strong>
                  Session Monitoring
                </strong>

                <p>
                  Record and review privileged
                  user activity.
                </p>
              </section>
            </div>


            <div>
              <span>03</span>

              <section>
                <strong>
                  Access Governance
                </strong>

                <p>
                  Manage user access to
                  infrastructure resources.
                </p>
              </section>
            </div>


            <div>
              <span>04</span>

              <section>
                <strong>
                  Audit & Security
                </strong>

                <p>
                  Trace authentication and
                  privileged actions.
                </p>
              </section>
            </div>

          </div>


          <div className="aks-login-v6-status">

            <div>
              <i />

              <span>
                Security controls enabled
              </span>
            </div>

          </div>

        </section>


        <section className="aks-login-v6-auth">

          <div className="aks-login-v6-auth-head">

            <div className="aks-login-v6-mobile-brand">

              <img
                src={aksaraLogo}
                alt="AKSARA"
                className="aks-login-v6-mobile-brand-image"
              />

            </div>

            <h2>
              Sign in to AKSARA
            </h2>


            <p>
              Sign in with your AKSARA
              account to continue.
            </p>

          </div>


          <form
            className="aks-login-v6-form"
            onSubmit={onSubmit}
          >

            <label>

              <span>
                Username
              </span>


              <div className="aks-login-v6-input">

                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                  />

                  <path
                    d="M5 21a7 7 0 0 1 14 0"
                  />
                </svg>


                <input
                  type="text"
                  value={username}
                  onChange={
                    event =>
                      setUsername(
                        event.target.value
                      )
                  }
                  placeholder="Enter your username"
                  autoComplete="username"
                  autoFocus
                />

              </div>

            </label>


            <label>

              <div className="aks-login-v6-label-row">

                <span>
                  Password
                </span>

                <small>
                  Required
                </small>

              </div>


              <div className="aks-login-v6-input">

                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                  />

                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                  />
                </svg>


                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={
                    event =>
                      setPassword(
                        event.target.value
                      )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />


                <button
                  type="button"
                  className="aks-login-v6-show"
                  onClick={() =>
                    setShowPassword(
                      current => !current
                    )
                  }
                >
                  {showPassword
                    ? 'Hide'
                    : 'Show'}
                </button>

              </div>

            </label>


            {error && (
              <div className="aks-login-v6-error">

                <strong>
                  Sign in failed
                </strong>

                <span>
                  {error}
                </span>

              </div>
            )}


            <button
              type="submit"
              className="aks-login-v6-submit"
              disabled={
                loading ||
                !username.trim() ||
                !password
              }
            >

              {loading
                ? 'Signing in...'
                : (
                  <>
                    Sign in
                    <span>→</span>
                  </>
                )}

            </button>

          </form>


          <div className="aks-login-v6-security">

            <div>

              <svg viewBox="0 0 24 24">

                <path
                  d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"
                />

                <path
                  d="m9 12 2 2 4-4"
                />

              </svg>

            </div>


            <section>

              <strong>
                Protected authentication
              </strong>

              <p>
                Authentication and privileged
                activity may be recorded for
                security and audit purposes.
              </p>

            </section>

          </div>

        </section>

      </main>


      <footer className="aks-login-v6-footer">

        <span>
          © 2026 AKSARA
        </span>

        <span>
          Infrastructure Security Platform
        </span>

        <span>
          v0.1.0
        </span>

      </footer>

    </div>
  )
}