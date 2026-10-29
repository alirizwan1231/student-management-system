import { z } from "zod";

// Fix 9 (audit M-3): one password rule, shared by signup / reset / change.
// Minimum 10 characters, at least one letter and one number, and not one of
// the most common passwords. The SAME rule must be set in Supabase
// (Authentication -> Settings -> Password) so a direct API signup is held to
// it too -- see STEP-BY-STEP-GUIDE.md. Login deliberately does NOT use this
// schema: accounts created under the old rule must still be able to sign in.
const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "qwerty123",
  "qwertyuiop", "11111111", "123123123", "abc123456", "password123", "letmein123",
  "iloveyou1", "admin1234", "welcome123", "football1", "baseball1", "sunshine1",
  "princess1", "dragon123", "master123", "monkey123", "shadow123", "superman1",
  "michael123", "student123", "university", "123456789a", "qwerty1234",
]);

export const strongPasswordSchema = z
  .string()
  .min(10, "At least 10 characters")
  .regex(/[A-Za-z]/, "Must contain at least one letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), {
    message: "This password is too common. Choose something less guessable.",
  });

export function passwordChecklist(pw: string) {
  return [
    { label: "At least 10 characters", ok: pw.length >= 10 },
    { label: "Contains a letter", ok: /[A-Za-z]/.test(pw) },
    { label: "Contains a number", ok: /[0-9]/.test(pw) },
    { label: "Not a common password", ok: pw.length > 0 && !COMMON_PASSWORDS.has(pw.toLowerCase()) },
  ];
}

export const signupSchema = z
  .object({
    fullName: z.string().min(2, "Please enter your name"),
    email: z.string().email("Enter a valid email"),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Repeat your password")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
