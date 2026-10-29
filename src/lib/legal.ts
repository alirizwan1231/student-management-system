// Legal identity for the Privacy Policy and Terms pages.
// Fix 14 (audit L-1): these used to be hard-coded template placeholders
// ("Your Name or Company Name", "Your Country", support@example.com).
// Set the real values in your environment (.env.local locally, and
// Vercel -> Project -> Settings -> Environment Variables in production):
//   LEGAL_OPERATOR_NAME   your full legal name or company name
//   LEGAL_COUNTRY         the country whose laws govern the Terms
//   SUPPORT_EMAIL         a mailbox that actually receives mail, on your
//                         verified sending domain (see the step-by-step
//                         guide, Fix 2). Until SUPPORT_EMAIL is set the
//                         pages fall back to the placeholder below -- do
//                         not launch like that.
export const LEGAL = {
  appName: "University Manager",
  operator: process.env.LEGAL_OPERATOR_NAME || "Your Name or Company Name", // TODO: set LEGAL_OPERATOR_NAME
  country: process.env.LEGAL_COUNTRY || "Your Country", // TODO: set LEGAL_COUNTRY
  retentionDays: 30, // how long backups may keep deleted data
  minimumAge: 13,
  lastUpdated: "29 October 2026",
  supportEmail: process.env.SUPPORT_EMAIL || "support@example.com", // TODO: set SUPPORT_EMAIL to a real mailbox
};
