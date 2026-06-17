# TDR-005: Caddy over Nginx

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-06-16 |
| **Deciders** | DevOps/SRE, Principal Architect |

---

## Context

C.O.R.T.E.X. requires a reverse proxy for TLS termination, path routing (frontend `/`, API `/api`), security headers, and optional automatic HTTPS for self-hosters exposing to the internet.

## Decision

Use **Caddy 2** as the reverse proxy in all Docker Compose profiles.

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Caddy (chosen)** | Auto HTTPS (Let's Encrypt); simple Caddyfile; HTTP/3 | Less enterprise familiarity than Nginx |
| **Nginx** | Ubiquitous; high performance; extensive docs | Manual cert management; complex config |
| **Traefik** | Docker-native service discovery | Overkill for static compose; harder debug |
| **No proxy (dev only)** | Simpler dev | No TLS; no unified origin |

## Rationale

1. **Zero-config TLS:** Self-hosters with a domain get HTTPS automatically:
   ```
   cortex.example.com {
       reverse_proxy /api/* api:8000
       reverse_proxy /* web:3000
   }
   ```
2. **Solo developer UX:** Matches "deploy in 10 minutes" — no certbot sidecar.
3. **Security headers:** Single Caddyfile block for HSTS, CSP, X-Frame-Options (Helmet.js equivalent at edge).
4. **Simpler config:** ~30 lines vs ~80 for equivalent Nginx + SSL
5. **HTTP/3 optional:** Future-proof without config change.

## Caddyfile (Production)

```caddyfile
{$C.O.R.T.E.X._DOMAIN:localhost} {
    encode gzip zstd

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    handle /api/* {
        reverse_proxy api:8000
    }

    handle /* {
        reverse_proxy web:3000
    }
}
```

## Consequences

### Positive
- Automatic cert renewal
- Single entry point for browser (no CORS complexity between ports)

### Negative
- Enterprise teams may prefer Nginx — provide `infra/nginx/` as optional Tier 3 contrib
- Localhost dev uses internal HTTP (no TLS needed)

## Mitigations

- Document manual Nginx equivalent in `docs/self-hosting/configuration.md` (Stage 2)
- Caddy admin API disabled in production config

## References

- [Caddy documentation](https://caddyserver.com/docs/)
