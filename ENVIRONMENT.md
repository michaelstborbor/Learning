# Environment Variables

All variables are documented (without real values) in `.env.example`. Copy it to
`.env` for local development. **Never commit `.env`** — it's already in `.gitignore`.

| Variable | Required now? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes (once auth is built) | Signs/encrypts session cookies |
| `APP_BASE_URL` | Yes | Used in generated links (emails, certificate verification URLs) |
| `STORAGE_DRIVER` | No | `s3`, `blob` or `local`. Defaults to `s3` when `STORAGE_S3_BUCKET` is set, `blob` when `BLOB_READ_WRITE_TOKEN` is set, otherwise `local` |
| `BLOB_READ_WRITE_TOKEN` | On Vercel | Added automatically when a **private** Vercel Blob store is connected to the project. Vercel functions reject uploads over 4.5 MB and have no writable disk, so media must go to Blob (or S3) there |
| `STORAGE_S3_ENDPOINT` | For S3 | Bucket API endpoint without the bucket name, e.g. `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_S3_BUCKET` | For S3 | Bucket name for course media |
| `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY` | For S3 | API token with read/write access to that bucket only |
| `STORAGE_S3_REGION` | No | `auto` for Cloudflare R2 (default), or the AWS region |
| `MEDIA_STORAGE_DIR` | No | Folder for `local` storage. Default `./storage/media` |
| `MEDIA_MAX_UPLOAD_MB` | No | Largest file accepted after compression. Default `500` |
| `ANTHROPIC_API_KEY` | For the study buddy | Claude API key for the AI study buddy chat on every course. Without it the chat shows as offline |
| `TUTOR_MODEL` | No | Claude model for the study buddy. Default `claude-opus-5-5` |
| `BOT_PROTECTION` | No | Vercel BotID check on sign-up, login, password reset and the study buddy. On by default; set to `off` and redeploy only in an emergency (for example if real people are being blocked) |
| `EMAIL_*` | Not yet | Added when the notification module is implemented |
| `PAYMENT_*` | Not yet | Deferred — platform launches free/open-access |

## Production

Production environment variables are set directly in the hosting provider's
dashboard (not committed anywhere), following the same pattern used for the IDTS
project on Render.
