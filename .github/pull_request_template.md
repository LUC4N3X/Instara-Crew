## Summary

Describe clearly what this PR changes and why.

## Scope

- [ ] The PR has a focused scope and does not include unrelated refactors.
- [ ] I listed the user-visible/runtime behavior that changes.
- [ ] I checked whether database migrations or environment variables are required.

## Instagram runtime safety

- [ ] No rate-limit or safety guard was silently disabled.
- [ ] No password-login, follower scraping, mass follow/unfollow or DM automation was added.
- [ ] No arbitrary ADB shell execution was exposed to the dashboard/API.
- [ ] Instagram targets remain restricted to validated HTTPS `instagram.com` URLs.
- [ ] Dry Run still avoids the final external action.
- [ ] Login/action-block states still stop or pause the affected account.

## Sensitive areas touched

Check every area modified by this PR:

- [ ] Browser / Playwright runtime
- [ ] Android / ADB runtime
- [ ] Meta OAuth / Graph API
- [ ] Authentication / encryption / credentials
- [ ] Proxy handling
- [ ] Rate limits / worker concurrency
- [ ] Prisma schema / migrations
- [ ] None of the above

## Verification

- [ ] `npm run prisma:generate`
- [ ] `npm run typecheck`
- [ ] `npm run test:guardrails`
- [ ] `npm run test:selftest`
- [ ] `npm run test:android`
- [ ] Android bridge self-test when Android files changed
- [ ] `npm run build`

## Manual notes

List anything CI cannot verify: real-device checks, Instagram UI/version assumptions, migration steps, known limitations, or follow-up work.
