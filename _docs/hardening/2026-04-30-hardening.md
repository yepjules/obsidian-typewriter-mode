# Hardening Report — obsidian-typewriter-mode

**Date:** 2026-04-30
**Branch:** `main` (clean)
**Repo:** `github.com/yepjules/obsidian-typewriter-mode` (fork; upstream `davisriedel/obsidian-typewriter-mode`)
**Versions:** `manifest.json` 1.3.1 (stable) · `manifest-beta.json` 1.4.0-beta.1 (BRAT) · `package.json` 1.4.0-beta.1
**Auditor:** Claude (harden-plugin skill)

---

## Hardening Summary: obsidian-typewriter-mode

### Remote safety

- `origin` → `yepjules/obsidian-typewriter-mode` ✅ (push target)
- `upstream` → `davisriedel/obsidian-typewriter-mode` ✅ (read-only; no pushes attempted)
- Working tree clean. No commits made during this audit.

### Findings

#### Security

- **Secret scan:** clean. Grep for `sk-*`, `ghp_*`, `github_pat_*`, `xox*`, AWS access keys, PEM blocks, `password=`, `api_key=`, `secret=`, `token=` returned 0 matches across `src/`, `scripts/`, configs.
- **Semgrep:** clean. 257 rules from `p/typescript`, `p/javascript`, `p/security-audit`, `p/owasp-top-ten` over 104 files → **0 findings**.
- **Dependabot alerts:** **0 open** (`gh api repos/yepjules/obsidian-typewriter-mode/dependabot/alerts`).

#### CI / Workflow hygiene (P2 — pre-existing in upstream)

These exist in inherited workflow files, are not exploitable, but accumulate technical debt and will eventually break when GitHub deprecates the legacy actions.

1. `.github/workflows/check.yml:17` — `actions/checkout@v2` is deprecated (current is `@v4`).
2. `.github/workflows/release.yml:24` — same `actions/checkout@v2`.
3. `.github/workflows/release.yml:50` — `actions/create-release@v1` is **archived/unmaintained** since 2021. Recommend migrating to `softprops/action-gh-release`.
4. `.github/workflows/release.yml:63,73,84,95` — `actions/upload-release-asset@v1` is **archived/unmaintained**. Same migration target.
5. `.github/workflows/release.yml:46` — `::set-output` syntax was deprecated by GitHub Actions in 2022; replace with `$GITHUB_OUTPUT` env file pattern.
6. `setup-bun@v2` uses `bun-version: latest` in both workflows — non-reproducible builds. Pin to a specific minor (e.g., `1.3.x`) for release builds.

#### Code quality (P3 — non-blocking, pre-existing)

Biome `lint/complexity/noExcessiveCognitiveComplexity` warnings (3):

- `src/capabilities/settings.ts:246` — `migrateSettings()` complexity 39 (max 20). Legacy migration code; refactor risk > benefit until next major.
- `src/cm6/highlight-sentence.ts:29` — `getActiveSentenceBounds()` complexity 30.
- `src/cm6/typewriter-offset-calculator.ts:48` — `getTypewriterPositionData()` complexity 25.

#### Trivial format issues (auto-fixable)

- `manifest-beta.json` — missing trailing newline.
- `versions.json` — missing trailing newline.

These are blocking Biome `check` (exit 1). `bun biome check --write` would fix them, but they are upstream-tracked files; recommend deferring until next fork-sync to avoid noise.

#### Test coverage gap

- **No `*.test.ts` files in repo.** `package.json` has no `test` script. Plugin relies entirely on manual testing in `test-vault/`. Not adding tests in this pass per skill scope.

### Changes

**None.** Per skill instructions: minimal fixes, no refactors, no commits without approval. All findings recorded for review.

### Commands run

```sh
git remote -v && git branch --show-current && git status --short
gh api repos/yepjules/obsidian-typewriter-mode/dependabot/alerts --jq 'map(select(.state=="open")) | length'
# → 0
semgrep --config=p/typescript --config=p/javascript --config=p/security-audit --config=p/owasp-top-ten \
        --metrics=off --severity=ERROR --severity=WARNING \
        --exclude=node_modules --exclude=dist --exclude=_backups --exclude=scripts/common src
# → 257 rules, 104 files, 0 findings
bun install                        # 242 packages
bun tsgo --noEmit                  # clean
bun biome check                    # 2 errors (trailing newlines), 3 warnings (complexity)
```

### Tests

- No project test suite present. Typecheck (`tsgo --noEmit`) passes.
- Build (`just build`) **not run locally** — requires `grass` (Rust SCSS compiler) which isn't installed and `cargo` is unavailable in this environment. CI installs it via `baptiste0928/cargo-install@v3`. TypeScript portion typechecks clean, so no signal-loss for this audit.

### Files written

- `_docs/hardening/2026-04-30-hardening.md` (this file)

### PR

- None opened. Awaiting user direction on workflow modernization (items 1–6 in CI findings) and trailing-newline fixes.

### Remaining risks

| Risk | Severity | Notes |
|---|---|---|
| Archived release actions (`create-release`, `upload-release-asset`) | P2 | Will fail at some point when GitHub fully removes them; release workflow becomes silently broken |
| `bun-version: latest` in CI | P2 | Reproducibility — a breaking Bun release could surprise a tag push |
| `actions/checkout@v2` | P3 | Deprecated, still works; modernize when convenient |
| `::set-output` syntax | P3 | Currently emits warning; will eventually fail |
| No automated tests | P3 | Acceptable for this plugin's scope; document rather than scaffold |
| 3 high-complexity functions | P3 | Pre-existing legacy; defer until major-version refactor |
| Local build needs `cargo install grass` | env | Not a defect — document for new contributors |

### Recommended next actions (ordered)

1. **Modernize `release.yml`** — single PR replacing both `create-release` + `upload-release-asset` with `softprops/action-gh-release@v2`, fixing `::set-output`, bumping `checkout@v4`. High value, low risk.
2. **Pin Bun version** in workflows (`bun-version: 1.3.13` or whichever is current at next release).
3. **Document `grass` requirement** in README/CONTRIBUTING (or migrate to a JS-based SCSS compiler — `sass` npm package is a candidate, but evaluate output parity first).
4. Defer trailing-newline fixes to next upstream sync to keep the diff against `davisriedel` minimal.
