# Security Specification

## Authentication Flow (JWT)
- Login: `POST /api/auth/login` → returns access/refresh tokens (httpOnly cookies).
- Refresh: `POST /api/auth/refresh` to rotate access token.
- Logout: `POST /api/auth/logout` clears cookies.
- Frontend uses `api-client` with `credentials: include`; auto-retries on 401 by calling `/auth/refresh`.

## Roles and Capabilities
- `admin`: full access to user/invite moderation, files (all), share-links management.
- `staff` (new): operational role for read/manage files and share-links, but no user role changes.
- `user`: owns their files; can see public files of others; can create share links for their files.

## Protected Endpoints (examples)
- Admin-only: `/api/users/**`, `/api/invites/**`, `/api/files/:id/approve|reject`, `/api/share-links` (list/create/toggle).
- Staff: same as user plus read all files/share-links; cannot change user roles.
- User: `/api/files` (CRUD own), `/api/files/:id/download[-url]`, `/api/share-links/token/:token/access|download-url` (public by token).

## Token Lifetime
- Access: short-lived (15m default).
- Refresh: longer-lived (7d default). Stored as httpOnly secure cookie when `AUTH_COOKIE_SECURE=true`.

## Additional Notes
- Public share is gated by signed `token` (UUID) + optional password. Share link validates active/expiry/password before returning presigned download URL.
- Sensitive responses should avoid over-sharing user metadata (only ownerId, path, visibility, status, createdAt). Use DTOs to control exposure.

