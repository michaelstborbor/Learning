# Environment Variables

All variables are documented (without real values) in `.env.example`. Copy it to
`.env` for local development. **Never commit `.env`** — it's already in `.gitignore`.

| Variable | Required now? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes (once auth is built) | Signs/encrypts session cookies |
| `APP_BASE_URL` | Yes | Used in generated links (emails, certificate verification URLs) |
| `STORAGE_*` | Not yet | Added when file/video upload is implemented |
| `EMAIL_*` | Not yet | Added when the notification module is implemented |
| `PAYMENT_*` | Not yet | Deferred — platform launches free/open-access |

## Production

Production environment variables are set directly in the hosting provider's
dashboard (not committed anywhere), following the same pattern used for the IDTS
project on Render.
