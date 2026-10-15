# Email templates (Supabase)

Professional, mobile-friendly HTML emails. Paste each one into
**Supabase Dashboard -> Authentication -> Emails -> Templates**
(older dashboards: Authentication -> Email Templates).

| Supabase template | File | Subject line |
|---|---|---|
| Confirm signup | `1-confirm-signup.html` | Confirm your University Manager account |
| Reset password | `2-reset-password.html` | Reset your University Manager password |
| Magic link (used for email-code sign-in) | `3-sign-in-code-magic-link.html` | Your University Manager sign-in code: {{ .Token }} |
| Change email address | `4-change-email.html` | Confirm your new email address |

## Required Supabase settings
1. **Authentication -> URL Configuration**: set *Site URL* to your real domain
   (`http://localhost:3000` while testing) and add `<your-domain>/**` to *Redirect URLs*.
   The links in these emails point to `{{ .SiteURL }}/auth/confirm`, which the app handles.
2. **Email OTP length**: the app accepts 6 to 8 digits. Keep Supabase's default.
3. **Custom SMTP (strongly recommended before launch)**: Supabase's built-in mailer only sends a
   few emails per hour and to team members. Add Resend, Brevo, SendGrid or Gmail SMTP under
   Authentication -> SMTP Settings so real users receive these emails reliably.
4. Keep the `{{ .Token }}`, `{{ .TokenHash }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}` placeholders exactly as written.
