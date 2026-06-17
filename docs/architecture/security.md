# Security Architecture

Summary of C.O.R.T.E.X. security design. Full analysis in planning documents.

---

## Documents

| Topic | Document |
|-------|----------|
| Threat model (STRIDE) | [threat-model.md](../planning/threat-model.md) |
| Privacy & encryption | [privacy-model.md](../planning/privacy-model.md) |
| Pre-Stage-2 crypto decisions | [pre-stage2-decisions.md](../planning/pre-stage2-decisions.md) |
| Edge security headers | [TDR-005 Caddy](../planning/tdr/005-caddy-over-nginx.md) |

---

## Security Layers

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Edge (Caddy)                                   │
│   TLS 1.3, HSTS, CSP, X-Frame-Options, rate limit       │
├─────────────────────────────────────────────────────────┤
│ Layer 2: Application (FastAPI)                          │
│   JWT RS256, RBAC, IDOR checks, input validation         │
│   Rate limiting (slowapi + Redis)                       │
├─────────────────────────────────────────────────────────┤
│ Layer 3: Data                                           │
│   Argon2id passwords, AES-256-GCM tokens                │
│   Envelope encryption (master → DEK → fields)           │
├─────────────────────────────────────────────────────────┤
│ Layer 4: Infrastructure                               │
│   Internal Docker network, Redis auth, no exposed DB      │
├─────────────────────────────────────────────────────────┤
│ Layer 5: Governance (Tier 3)                          │
│   Audit logs, tamper-evident chain, SSO, PII redaction  │
└─────────────────────────────────────────────────────────┘
```

---

## Tier 1 Security Checklist

See [threat-model.md §13](../planning/threat-model.md#13-security-controls-checklist-stage-2-implementation) for implementation checklist during Stage 2.

---

## Related Documents

- [Architecture Overview](./overview.md)
- [PRD — NFR Security](../planning/PRD.md#63-security--privacy)
