# Auth0 Setup

This document describes the Auth0 tenant configuration required for C.O.R.T.E.X. after the migration from the local JWT/Argon2 identity stack.

Auth0 is the source of truth for identity.
Firestore remains the application data store for users, conversations, jobs, artifacts, workspaces, and audit data.

## 1. Create the Auth0 applications

Create these Auth0 applications in the tenant:

1. **Regular Web Application**
   - Use this for the Next.js frontend.
   - Enable Authorization Code Flow with PKCE.
   - Configure the allowed callback URLs for the frontend routes used by your app.
   - Configure the allowed logout URLs and web origins for the deployed frontend domain.

2. **Machine to Machine Application**
   - Use this for server-to-Auth0 Management API calls.
   - This is not used by the browser.
   - Grant it access to the Auth0 Management API only if you need server-side user provisioning or tenant administration later.

## 2. Create the Auth0 API

Create an Auth0 API for the backend, for example:

- **Identifier / Audience:** `https://api.cortex.app`
- **Signing Algorithm:** RS256

This API represents the C.O.R.T.E.X. backend audience. Access tokens issued for the app must target this audience.

## 3. Enable identity connections

Enable these connections in the Auth0 application:

- Database connection for email/password users
- Google social login
- GitHub social login

Auth0 should own:

- signup
- login
- password reset
- email verification
- MFA / TOTP
- refresh token rotation

## 4. Configure custom claims

Add an Auth0 Action on the **Post Login** flow.

The Action must inject these namespaced custom claims into tokens:

- `https://cortex.app/roles`
- `https://cortex.app/workspace_id`

Behavior requirements:

- Default the role to `user` if no app role is present in `app_metadata`.
- Read the role from `app_metadata` when present.
- Populate `https://cortex.app/workspace_id` after Firestore provisioning establishes the user’s primary workspace.

Recommended Action behavior:

```js
exports.onExecutePostLogin = async (event, api) => {
  const roles = event.user.app_metadata?.roles || ["user"];
  const workspaceId = event.user.app_metadata?.workspace_id || null;

  api.accessToken.setCustomClaim("https://cortex.app/roles", roles);
  if (workspaceId) {
    api.accessToken.setCustomClaim("https://cortex.app/workspace_id", workspaceId);
  }
};
```

If you also need these claims in the ID token for the frontend session bootstrap, mirror them there as well.

## 5. Token lifetimes

Set these token settings in Auth0:

- Access token lifetime: **30 minutes**
- Refresh token: **rotating**
- Refresh token absolute lifetime: **30 days**
- Refresh token inactivity expiry: **7 days**

These values match the intent of the previous self-managed JWT configuration.

## 6. Refresh token protection

Enable both of these in the Auth0 API/application settings:

- **Refresh Token Rotation**
- **Refresh Token Reuse Detection**

After this migration, the backend should no longer manage refresh token rotation manually.
Firestore may still keep a lightweight `sessions` collection for audit and device listing, but not for token issuance.

## 7. Frontend / backend settings

Set these environment variables:

Backend:

- `C.O.R.T.E.X._AUTH0_DOMAIN`
- `C.O.R.T.E.X._AUTH0_AUDIENCE`
- `C.O.R.T.E.X._AUTH0_CLIENT_ID`
- `C.O.R.T.E.X._AUTH0_CLIENT_SECRET`

Frontend:

- Auth0 domain
- Auth0 client id
- Auth0 audience
- callback/logout URLs

## 8. Firestore provisioning flow

On first verified token use:

1. The backend verifies the Auth0 JWT against the tenant JWKS.
2. The backend provisions or updates the Firestore `users/{sub}` record.
3. The backend stores app-specific data only:
   - preferences
   - storage quota
   - workspace membership
   - encrypted DEK metadata
4. The backend never stores Auth0 passwords or plaintext identity secrets.

## 9. Operational notes

- Keep the Auth0 JWKS cache TTL at 24 hours unless you have a short-lived key rotation policy.
- If a `kid` is missing from the cache, refresh the JWKS immediately and retry verification once.
- Do not hardcode private JWT signing keys in the application anymore.

## 10. Frontend integration contract

The Next.js frontend must use `@auth0/nextjs-auth0` for session handling.

Required rules:

- Login, signup, logout, password reset, and MFA all happen through Auth0 directly.
- The frontend does not send credentials through the FastAPI backend.
- Every backend request includes `Authorization: Bearer <access_token>`.
- The backend never receives or stores plaintext passwords after migration.

Practical consequences:

- The frontend should treat Auth0 as the identity provider and the FastAPI API as a protected resource server.
- The Firestore user record is provisioned on the first authenticated backend call, not during a backend register flow.
- Logout is primarily client-side session cleanup, with optional redirect to Auth0 logout.
