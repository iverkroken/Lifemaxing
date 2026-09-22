# Account lifecycle and provider setup

The September 20–21, 2026 scope adds public registration to the existing Identity application. Profiles and work remain private. Registration creates one Identity user, one settings row and ten standard Life Areas atomically. New public/Google accounts start with UTC, en-GB and English; existing provisioning retains its defaults. Change these preferences in Settings. No external delivery or real provider login has been configured or certified by this implementation task.

## Implemented

| Public page | Behavior |
| --- | --- |
| `/login` | Existing email/password login, Remember Me, signup/recovery links; configured Google or disabled provider controls |
| `/signup` | Validated registration and verification-required outcome |
| `/verify-email` | Deliberate confirmation of the email link |
| `/resend-verification` | Account-neutral verification request |
| `/forgot-password` | Account-neutral reset request |
| `/reset-password` | New password, invalid/expired link and success states |
| `/settings?section=security` | Authenticated current-password change and existing session controls |

All APIs are under `/api/v1/auth`: GET `providers`; POST `register`, `resend-verification`, `confirm-email`, `forgot-password`, `reset-password`, `change-password` and `external/google`. Existing `csrf`, `login`, `logout`, `logout-everywhere` and `me` remain. Every sensitive POST validates antiforgery; account attempts use the existing per-IP limiter. `change-password` requires an authenticated principal. The React API client gates it during account revalidation like other private requests.

Identity hashes passwords using the existing policy: 15–128 Unicode scalar values, spaces allowed, no composition rules, local common-password rejection. Confirmation remains required for password login. Duplicate registration returns a useful conflict; forgot/resend responses never identify an account. No delivery configuration returns the same unavailable response for every email. A configured-provider failure during forgot/resend remains neutral; the UI reports that a link was requested, not guaranteed delivery. A registration send failure retains the unconfirmed account and offers resend.

Identity Data Protection tokens last two hours by default (configured range 1–24). Confirmation tokens cannot reset passwords; reset updates the security stamp, invalidating reset replays and older sessions. Already-confirmed links are rejected. Change password signs out this client and invalidates other old cookies at the existing stamp-validation interval, at most one minute. Google-created passwordless users can establish a password through email recovery after email delivery is configured.

Tokens travel only in the email link's URL fragment and the deliberate confirmation/reset POST. The SPA removes the fragment from browser history on entry and holds it in component memory, so refreshing that form requires reopening the email link. No token is returned from an API or logged. Existing no-referrer headers remain; reverse proxies and diagnostics must not record request bodies or fragments. Persistent Data Protection keys must survive restarts as documented in README.

## Email configuration

`appsettings.Accounts.example.json` is a reference template, **not automatically loaded**. Put real values in ASP.NET User Secrets or deployment environment variables. Root `.env` serves Compose and is not automatically read as ASP.NET configuration.

| Environment variable | Meaning |
| --- | --- |
| `Authentication__Accounts__PublicOrigin` | Exact SPA origin, e.g. `https://app.example.com`; HTTPS outside Development; loopback HTTP permitted only in Development; no path/query/fragment/userinfo |
| `Authentication__Accounts__TokenLifetimeHours` | Default 2; accepted 1–24 |
| `Authentication__Accounts__Email__Provider` | `Disabled` (default), `Development`, or `Resend` |
| `Authentication__Accounts__Email__ApiKey` | Resend API secret, secret store only |
| `Authentication__Accounts__Email__From` | Sender using a domain verified with Resend |
| `Authentication__Accounts__Email__MailboxDirectory` | Optional absolute private Development mailbox directory, outside repository/webroot |
| `AllowedHosts` | Actual public host name(s), without scheme; existing defaults allow localhost only |

Development example (contains no secret):

```powershell
node scripts/run-dotnet.mjs user-secrets set "Authentication:Accounts:PublicOrigin" "http://localhost:5173" --project server/Lifemaxing.Api
node scripts/run-dotnet.mjs user-secrets set "Authentication:Accounts:Email:Provider" "Development" --project server/Lifemaxing.Api
```

Restart the API after configuration changes. Use the exact origin opened in the browser. The default mailbox is `%LOCALAPPDATA%/Lifemaxing/mailbox/Development` on Windows; other platforms use .NET's LocalApplicationData directory. Files have random names and JSON `To`, `Subject`, `Link` fields. Inspect them locally with your editor; do not paste links into logs, commits or issue reports. Windows restricts directory ACLs to the process account; Unix uses owner-only modes. Paths inside the repository/webroot or through symbolic links are rejected. Development delivery cannot activate in Production. Delete old local messages after testing. The isolated browser runner uses and cleans its own private temporary mailbox.

Resend uses a small `IAccountEmailSender` boundary and ordinary HttpClient; no provider SDK is required. Set Provider, trusted PublicOrigin, From and ApiKey to enable it. Missing values leave it unavailable. HTTP acceptance means the provider accepted the message, not proof that an inbox received it. Provider payloads and HTTP client logs are suppressed for these messages. Confirm real inbox delivery, sender DNS and deployed URLs before calling production email operational. See [Resend's send API](https://resend.com/docs/api-reference/emails/send-email).

## Google: implemented, requires configuration

Microsoft's `Microsoft.AspNetCore.Authentication.Google` handler drives OAuth state/correlation and token exchange. External identity maps into `AspNetUserLogins` and the same local AppUser model. No access/refresh tokens are retained. The v3 userinfo email must be verified; matching an existing account email never silently links it. That user must sign in with the local password or recover access. A dedicated authenticated provider-linking screen is not included.

Configure `Authentication__Google__ClientId` and `Authentication__Google__ClientSecret` from an OAuth web client, plus the trusted PublicOrigin. Register this exact authorized redirect URI:

```text
https://app.example.com/api/v1/auth/external/google/complete
```

Use the loopback development origin/port for its separately registered redirect. `/complete` is the middleware callback; `/api/v1/auth/external/google/callback` is the internal Identity completion endpoint. Google success returns through `/login?external=complete` so the SPA broadcasts the account change before opening Today. The configured origin determines the OAuth redirect in both challenge and token exchange; request Host is never used as the trust source. POST initiation carries CSRF via a native form. Keep production HTTPS, secure cookies, correct AllowedHosts, proxy configuration and persistent keys.

Google is disabled unless both secrets and a valid origin are configured. Automated tests cover the real middleware with a **simulated backchannel**, including unverified-email rejection and existing-email non-linking. Real Google authentication still requires credential setup and browser verification. See [Microsoft's Google setup](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/google-logins?view=aspnetcore-10.0).

## Apple: prepared boundary, not implemented OAuth

The disabled UI and bound `Authentication:Apple` options (`ClientId`, `TeamId`, `KeyId`) establish the integration boundary. Supplying them does **not** enable Apple. There is no fake challenge or custom OAuth code.

Future implementation needs an Apple Services ID, Team ID, Sign in with Apple key/Key ID, protected private signing key and client-secret rotation, registered HTTPS domains/return URLs, a supported ASP.NET authentication handler, and real callback/nonce/state/relay-email validation. It must use the same local Identity users/logins and the same non-linking rule. Apple key storage, handler and rotation are planned, not shipped.

The Identity token approach follows [Microsoft's account confirmation/recovery guidance](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/accconfirm?view=aspnetcore-10.0).
