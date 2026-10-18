# Brevo email setup (no domain needed)

1. brevo.com -> sign up (free plan: 300 emails/day).
2. Senders: add and verify a sender email (e.g. your Gmail) -> this is EMAIL_FROM.
3. SMTP & API -> API Keys -> generate -> BREVO_API_KEY (app emails: contact form, digest, deletion notice).
4. SMTP & API -> SMTP tab -> generate an SMTP key -> use it in Supabase -> Authentication -> Emails -> SMTP Settings
   (host smtp-relay.brevo.com, port 587, username = your Brevo SMTP login, password = the SMTP key,
   sender = the verified sender). This is what makes sign-up / reset-password / email-code emails work.
5. In Supabase raise Authentication -> Rate Limits -> "emails per hour" (e.g. 100).
6. .env.local + Vercel: EMAIL_PROVIDER=brevo, BREVO_API_KEY, EMAIL_FROM, SUPPORT_EMAIL.
Keep Brevo -> Security -> Authorized IPs OFF, otherwise Vercel's changing IPs are blocked.
