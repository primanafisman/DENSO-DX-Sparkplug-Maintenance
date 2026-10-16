# Security

Browser cookieJWT HttpOnly/SameSite, signed session-bound CSRF, origin allowlist, bcrypt password hashes and server-side roles. Secrets stay in ignored `.env`; internal Python token is never sent to the browser. Production requires HTTPS and Secure cookies. Login throttled; upload/ROI/queue/session limits are enforced.

Evidence authorized; safe errors omit private paths/dependency stacks; logger redacts credentials/images. CSV text formulas neutralized, history query filters/sort bounded. Application startup never creates database schema.

Use a single API/worker; restart invalidates temporary IDs and in-memory logout revocation. JWTs expire in one hour. For corporate deployment, integrate durable revocation/SSO/session policy if required; do not assume local JWT logout revocation survives process restart. Process sudden termination may leave orphan evidence files; database confirmation transactions remain the source of saved-record truth.

Report findings through authorized company channels. This source package does not claim a company penetration test or accepted security gate. Public verification scope is described in docs/verification/README.md; private audit evidence is not published.
