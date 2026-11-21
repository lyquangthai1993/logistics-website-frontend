# Frontend RBAC

This document describes the frontend role checks used by Logistics TMS. The authoritative cross-layer role and endpoint matrix is `.agents/rules/rbac-matrix.md` in the repository root.

## Enforcement layers

- `src/config/nav-config.ts` controls which links appear in the sidebar and command menu.
- `src/hooks/use-nav.ts` filters those links using the authenticated user's role. This is a presentation check only.
- `src/proxy.ts` protects dashboard routes using the role ID in the access token. The longest matching route prefix wins, so report-only routes can be allowed inside the admin route group without allowing admin management pages.
- Backend NestJS guards are the security boundary for API access. Frontend visibility and redirects do not replace API authorization.

## Roles

| Role | DB ID | Frontend access |
|---|---:|---|
| `SUPER_ADMIN` | 1 | All dashboard modules |
| `DISPATCHER` | 2 | Dispatch and permitted operational pages |
| `FLEET_MANAGER` | 3 | Trips and fleet |
| `WAREHOUSE_MANAGER` | 4 | Assigned warehouse workflows |
| `REPORT_VIEWER` | 5 | Read-only operational reports and daily trip reports |

## REPORT_VIEWER route policy

Allowed routes:

- `/dashboard/admin/reports`
- `/dashboard/admin/reports/trips` and nested report pages

Denied routes include cronjob management, hub management, users, warehouse workflows, trips, fleet, profile, and other dashboard pages. A denied route redirects to `/dashboard/admin/reports`.

The reports sidebar links are visible to `SUPER_ADMIN` and `REPORT_VIEWER`. Other admin links remain limited to `SUPER_ADMIN`.

## REPORT_VIEWER backend policy

The role can read:

- `GET /api/v1/admin/reports/operational`
- `GET /api/v1/admin/reports/operational/daily-trips`
- `GET /api/v1/admin/reports/regional-dispatch`

The role cannot run report synchronization, manage or rerun cronjobs, write operational data, upload files, or use other non-report APIs. Hub GET endpoints are available to populate report filters; hub write endpoints remain admin-only.

## Adding or changing a role

1. Add the role ID to the backend `RoleEnum` and database role seed/migration.
2. Add the role to the frontend `UserRole`, role ID normalization maps, and user role options.
3. Update sidebar visibility in `nav-config.ts` and route policy in `proxy.ts`.
4. Apply least-privilege backend controller guards and update the root RBAC matrix.
5. Add E2E coverage for allowed and denied routes. API authorization must be verified separately from client-side navigation.
