# Instara Crew PR Review Rules

Every pull request is checked by the repository CI and the dedicated PR audit workflow.

## Automatic blockers

The PR audit fails when newly added lines appear to introduce or explicitly enable behavior such as:

- disabling global rate limits;
- disabling hourly/daily/minimum-gap limits through repository defaults;
- password-based Instagram login automation;
- follower scraping or mass follow/unfollow automation;
- arbitrary ADB shell execution exposed through application inputs;
- other capabilities explicitly outside Instara Crew's comment-workflow scope.

A blocker means the change needs manual review before it should be merged.

## Automatic review warnings

The audit highlights PRs touching sensitive runtime areas, including:

- `src/lib/instagram.ts`
- `src/lib/android.ts`
- `scripts/android_bridge.py`
- `src/lib/browser.ts`
- `src/lib/limits.ts`
- `src/lib/proxy.ts`
- `src/lib/security.ts`
- `src/lib/meta-client.ts`
- `src/worker.ts`
- authentication routes
- Prisma schema
- GitHub workflows

These warnings do not fail the PR by themselves. They tell the reviewer where extra attention is required.

## CI failure reporting

When the main `CI` workflow completes unsuccessfully, the repository posts a concise report on the associated pull request showing the failed job and failed steps, with a direct link to the GitHub Actions run.
