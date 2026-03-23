# Recallio | AI-Powered Smart Study

Recallio is a premium study companion designed for university students to synthesize notes, generate active recall questions, and master complex subjects with AI-powered tools.

## Features

- **AI Analysis**: Instantly create study material from raw notes.
- **Smart Definitions**: Automatically extract key concepts into a personal glossary.
- **Exam Simulation**: Test yourself under pressure with timed sessions.
- **Priority Review**: Smart algorithm prioritizes your weakest concepts.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend & Auth**: Supabase
- **Payments**: Paystack

## Getting Started

1. Clone the repository
2. Install dependencies: `npm i`
3. Set up environment variables in `.env`
4. Start development server: `npm run dev`

### Confirmation email not working?

Supabase’s **built-in email** only sends to a small allowlist and has strict limits, so confirmation emails often don’t arrive. To fix:

1. **Supabase Dashboard** → your project → **Authentication** → **Providers** → **Email**
   - Turn **“Confirm email”** on if you want users to confirm before signing in.
   - Leave it off if you want immediate sign-in without confirmation.

2. **Use custom SMTP (recommended for production)**  
   **Authentication** → **Email Templates** (or **SMTP Settings** / **Project Settings** → **Auth**):
   - Add **Custom SMTP** with a provider such as **Resend**, **SendGrid**, **Mailgun**, **Brevo**, or **AWS SES**.
   - Supabase will then send auth emails (confirm, reset password) via your SMTP so they reliably reach users.

3. **Redirect after confirm**  
   The app uses `emailRedirectTo: origin/dashboard` so after users click the link in the email they land on the dashboard.

## Deployment

Deploy using your preferred hosting provider (Vercel, Netlify, Cloudflare Pages, etc.). Ensure your Supabase Edge Functions are deployed and secrets are configured.

---
© 2026 Recallio.
