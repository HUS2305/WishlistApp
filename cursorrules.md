# WishlistApp

## MVP Scope
- Deliver a polished mobile-first experience on iOS and Android with a roadmap to web.
- Focus on the core loop: create profile, connect with friends, build and share wishlists, add products quickly.
- Support manual and assisted item capture (clipboard parsing, photo upload for used with OpenAi vision).
- Establish minimum viable affiliate tracking by preserving outbound links and capturing click events.
- Ship with clear privacy controls (private, friends-only, public) for wishlists and profiles.

## Target Personas
- **Gifter:** Keeps track of friends and family wishlists, needs reminders and frictionless purchasing.
- **Receiver:** Curates personal wishlists, wants discovery and easy sharing.
- **Social Planner:** Coordinates group gifts/events, values collaboration and transparency.
- **Influencer wishlists** Lets fans buy gifts and so on.

## Core User Journeys
- **Onboard & profile setup:** Sign up, confirm email/phone, configure profile visibility, discover friends.
- **Create & manage wishlists:** Create private or shared list, add items via URL/text, reorder, mark must-have vs nice-to-have.
- **Add product from clipboard:** Detect copied link/text, auto-suggest product on app open, pre-fill fields for confirmation.
- **Capture product via photo:** Upload product photo or screenshot, store for later processing flow (AI/ops).
- **Share & collaborate:** Share wishlist link, invite friends, allow commenting or reservation toggles.
- **Affiliate redirect:** Tap item → route through redirect service → land on merchant page while tracking attribution.

## Functional Requirements (MVP)
- User accounts with email/phone login, password reset, optional social sign-in for later phases.
- Friend management: search, request, accept, remove, display mutual connections.
- Wishlists: CRUD, privacy settings, collaborative settings, basic analytics (view counts).
- Items: title, description, price, currency, URL, image(s), priority tag, status (wanted, purchased).
- Clipboard ingestion: background listener to prompt add-item flow.
- Notifications: push and/or email for friend requests, wishlist updates (via OneSignal/Firebase).
- Affiliate tracking: redirect endpoint storing click metadata (user, item, timestamp).
- Admin tooling (early): simple dashboard or protected endpoints for content moderation, affiliate link management.

## Non-Functional Requirements
- Accessibility compliance (WCAG AA guidelines) for UI components.
- Secure storage of tokens/credentials, encrypted transport (HTTPS).
- Observability hooks (logging, crash reporting with Sentry), basic analytics (Mixpanel/Amplitude).
- Localization-ready architecture (string tables, currency handling).
- Automated testing coverage for critical flows (wishlist CRUD, friend requests, link redirect).

## Base Technology Decisions
- **Mobile app:** React Native + Expo + TypeScript. Expo Router for navigation, React Query for server state, Zustand for local state, NativeWind or Tamagui for styling.
- **Backend:** NestJS (TypeScript) on Node.js for structured API, Prisma ORM, PostgreSQL (Supabase/Neon for hosted dev).
- **Hosting:** Backend on Render/Railway for MVP, Postgres on managed provider, file storage via Supabase Storage or AWS S3. Cloudflare for redirect edge caching.
- **Auth:** Clerk (primary) for fast rollout; fallback plan to migrate to custom auth if scale or cost requires.
- **Affiliate tracking:** Custom redirect microservice (NestJS module) + link shortener domain; integrate with Skimlinks/Impact SDKs post-MVP.
- **CI/CD:** GitHub Actions for lint/test/build; Expo EAS for mobile builds; Dependabot/Renovate for dependency hygiene.
- **Dev tooling:** Monorepo with Turborepo to share types/utils across mobile/backend; ESLint, Prettier, Husky pre-commit hooks.

## UI Component Guidelines (CRITICAL)

### Component Library Strategy
**ALWAYS use components from `@/components/ui`** - These follow shadcn/ui design patterns adapted for React Native with NativeWind.

### Rules for UI Development:
1. **NEVER create custom UI components from scratch** - Always check `apps/mobile/src/components/ui/` first
2. **Use NativeWind/Tailwind classes** - All styling should use Tailwind utility classes via NativeWind
3. **Follow shadcn/ui patterns** - Components should be composable, accessible, and follow the shadcn/ui component structure
4. **Component location**: All reusable UI components go in `apps/mobile/src/components/ui/`
5. **Import pattern**: Always import from `@/components/ui` (e.g., `import { Button, Card, Input } from "@/components/ui"`)

### Available Component Libraries:
- **Primary**: Custom components in `@/components/ui` (shadcn/ui-style, built with NativeWind)
- **Reference**: Use shadcn/ui (https://ui.shadcn.com/docs/components) and Saas UI (https://saas-ui.dev/docs/components) as design references
- **Styling**: NativeWind (Tailwind CSS for React Native) - use utility classes, not StyleSheet.create()

### When Adding New Components:
1. Check if component exists in `@/components/ui`
2. If not, create it following shadcn/ui patterns:
   - Use NativeWind classes for styling
   - Make it composable and accessible
   - Export from `apps/mobile/src/components/ui/index.ts`
   - Use the `cn()` utility from `@/lib/utils` for conditional classes
3. Update this file if adding a new component category

### Component Standards:
- **Accessibility**: All components must be accessible (proper labels, roles, etc.)
- **TypeScript**: Fully typed with proper interfaces
- **Variants**: Use variant props for different styles (e.g., `variant="primary" | "secondary"`)
- **Composition**: Prefer composition over configuration
- **Consistency**: Follow existing component patterns for consistency

### Migration:
- Existing custom components should be gradually migrated to use the new component library
- New features MUST use components from `@/components/ui`
- When refactoring, replace custom StyleSheet.create() with NativeWind classes

