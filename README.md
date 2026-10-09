# React + TypeScript + Vite

## Supabase setup

Before using tasks, run `supabase/schema.sql` in the SQL Editor of the Supabase project configured in `.env`, then run `supabase/fix-rls.sql`. The second script removes recursive RLS policies and backfills profiles for users created before the schema was installed.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:


## Email invitations

Deploy the invitation Edge Function and configure Resend from the Supabase CLI:

```bash
supabase secrets set RESEND_API_KEY=re_... RESEND_FROM_EMAIL="Tiny Wins <invites@your-domain.example>"
supabase functions deploy send-invite-email
```

`RESEND_FROM_EMAIL` must use a sender domain verified in Resend. The frontend invokes `send-invite-email` after `invite_streak_member` creates the pending membership, and the function requires the caller's Supabase session token.
## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
