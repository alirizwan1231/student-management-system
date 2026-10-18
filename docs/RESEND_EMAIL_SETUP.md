# Resend: email setup (two separate parts)

## Part A - Supabase emails (reset password, sign-in code, confirm signup)
These are sent by **Supabase**, so they are configured in the Supabase dashboard, not in `.env.local`.
1. Resend: Domains -> Add domain -> add the DNS records it shows (SPF, DKIM) at your domain provider -> wait for "Verified".
2. Resend: API Keys -> Create API key (Sending access).
3. Supabase: Authentication -> Emails -> SMTP Settings -> **Enable custom SMTP**:
   - Host `smtp.resend.com`, Port `465`
   - Username `resend`
   - Password = your Resend API key
   - Sender email = an address on your verified domain (e.g. `no-reply@yourdomain.com`), Sender name = University Manager
4. Paste the 4 templates from `email-templates/` (Authentication -> Emails -> Templates).
5. Test: Forgot password and "Email code" login must arrive in the inbox within seconds.

## Part B - emails sent by the app (contact form, account-deletion notice)
Add to `.env.local` (and to your hosting provider's environment variables):

    RESEND_API_KEY=re_...
    EMAIL_FROM=University Manager <no-reply@yourdomain.com>
    SUPPORT_EMAIL=where-you-want-support-messages@yourdomain.com

`EMAIL_FROM` must use the domain you verified. Without these three, the contact form shows
"Support email is not set up yet" and no deletion notice is sent (everything else still works).
