# The backend

The site runs in one of two modes, decided entirely by whether two environment
variables are set.

| | No env vars | Both env vars set |
|---|---|---|
| Where data lives | This browser's localStorage | Postgres, on Supabase |
| Who sees your changes | Only you, only on this device | Everyone, on every device |
| Admin passcode | Any code opens the office | Checked on the server |
| "Reset demo data" | Available | Hidden — it would delete real records |

With no env vars nothing breaks: the app behaves exactly as it did before there
was a backend, which is what keeps deploy previews and local dev usable.

## Setting it up

### 1. Create the project

Make a project at [supabase.com](https://supabase.com). From
**Project Settings → API** you need two values:

- the **Project URL**
- the **anon public** key

Both are public by design — they ship in the browser bundle. What protects the
data is Row Level Security, not the secrecy of these values. The
**service_role** key is a different thing entirely: it bypasses every policy, so
it must never go anywhere near the front end.

### 2. Run the migration

In the Supabase dashboard, open the **SQL Editor** and run
`supabase/migrations/0001_init.sql`.

That creates the tables and, importantly, the policies. The shape of the access
rules is:

- **Anyone, signed in or not** can read `products` and `site_config`. That's what
  the marketing pages render from.
- **Anyone can insert** an enquiry, an order, or a trade order — a customer has
  to be able to submit a form.
- **Nobody anonymous can read** `leads`, `orders`, notes, or anything else.
  Customer names, emails and phone numbers are never readable without a session.
- **Signed-in admins** can do everything.

### 3. Create the admin account

**Authentication → Users → Add user.** Give it an email you control and a long
random password. This account is never typed by a human — the passcode stands in
for it — so make the password genuinely random and don't reuse it.

Turn **off** public sign-ups under **Authentication → Providers → Email**, or
anyone could make themselves an admin.

### 4. Deploy the login function

The passcode is checked here, not in the browser:

```bash
supabase link --project-ref your-project-ref
supabase secrets set ADMIN_PASSCODE=9876
supabase secrets set ADMIN_EMAIL=admin@example.com
supabase secrets set ADMIN_PASSWORD=the-long-random-password-from-step-3
supabase functions deploy admin-login --no-verify-jwt
```

`--no-verify-jwt` is deliberate and correct: this is the endpoint you call
*before* you have a session, so it can't require one.

To change the passcode later, `supabase secrets set ADMIN_PASSCODE=...` again.
No redeploy, no code change.

### 5. Point the site at it

Locally, `cp .env.example .env.local` and fill in the two values. For the
deployed site, add the same two under **Netlify → Site settings → Environment
variables**, then redeploy.

## How the passcode actually works

Typing `9876` does not unlock anything by itself. The sequence is:

1. The browser posts the code to the `admin-login` function.
2. The function compares it against `ADMIN_PASSCODE` — a secret it holds and the
   browser has never seen — using a constant-time comparison, after a fixed
   delay that makes the endpoint tedious to guess against.
3. On a match it signs in the fixed admin account and returns a real Supabase
   session.
4. Every table's policy demands `authenticated`. Without that session the
   database returns nothing, no matter what passcode the caller claims to know.

So the passcode is a convenient way to obtain a session, and the session is the
security boundary. Someone reading the JavaScript bundle finds the project URL
and the anon key — both public — and no way to read a customer record.

## What this design does not do

Worth knowing before you rely on it:

- **Both admins share one account.** The audit trail can't tell you which of the
  two of you archived a lead. Splitting into per-person logins means real
  per-user auth, which is a bigger change.
- **Last write wins, per row.** If you both edit the *same* enquiry within a few
  seconds, the later save overwrites the earlier. Different records are fine.
  For two people at one desk this is unlikely to bite.
- **Enquiry forms are open to the public**, which is what makes them work, and
  also means they can be spammed. If that starts happening, the fix is a captcha
  or a rate limit on the insert policy.
- **Deleting is real.** There's no soft-delete or undo behind the admin screens.
  Supabase's own daily backups are the safety net; make sure they're on.
