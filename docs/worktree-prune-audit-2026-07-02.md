# Worktree Prune Audit — 2026-07-02

No destructive cleanup was performed. This is the safe deletion map for the
Phase 1 pruning follow-up.

## Keep

These worktrees contain active goal work and local modifications:

- `goal-g01-guest-to-account` — active G01 work, dirty, behind `origin/main`
- `goal-g02-career-portfolio` — active G02 work, dirty, behind `origin/main`
- `goal-g03-career-compare` — active G03 work, dirty, behind `origin/main`
- `goal-g05-local-labor-market` — active G05 work, dirty, behind `origin/main`

These Claude worktrees are dirty or have untracked artifacts and need owner review
before removal:

- `.claude/worktrees/hopeful-zhukovsky` — untracked `docs/auto-superpowers/`
- `.claude/worktrees/intelligent-morse` — modified source files plus untracked `docs/auto-superpowers/`

## Likely Removable

These registered worktrees were clean when audited:

- `/Users/michaelgilbertson/.codex/worktrees/48a9/career-quest` (`cleanup-folders`, upstream gone)
- `/Users/michaelgilbertson/.codex/worktrees/88f6/career-quest` (`theme-change`, upstream gone)
- `/Users/michaelgilbertson/orca/workspaces/career-quest/daily-review-ci-node-version-jump-from-20-to-24`
- `/Users/michaelgilbertson/orca/workspaces/career-quest/issue-53-daily-review-png`
- `.claude/worktrees/upbeat-visvesvaraya-fed869`
- `.worktrees/claude-review-action` (`feature/claude-review-action`, upstream gone)
- `.worktrees/code-quality-pass` (`feature/code-quality-pass`, upstream gone)
- `.worktrees/onet-career-explorer` (`feat/onet-career-explorer`, upstream gone)

These need review before removal because they are stale but dirty:

- `.worktrees/career-personas` (`feat/career-personas`, upstream gone) — modified explore files plus untracked `scripts/count-onets.ts`

## Commands For Later

Run only after explicitly approving destructive cleanup:

```sh
git worktree remove /Users/michaelgilbertson/.codex/worktrees/48a9/career-quest
git worktree remove /Users/michaelgilbertson/.codex/worktrees/88f6/career-quest
git worktree remove /Users/michaelgilbertson/orca/workspaces/career-quest/daily-review-ci-node-version-jump-from-20-to-24
git worktree remove /Users/michaelgilbertson/orca/workspaces/career-quest/issue-53-daily-review-png
git worktree remove /Users/michaelgilbertson/Projects/career-quest/.claude/worktrees/upbeat-visvesvaraya-fed869
git worktree remove /Users/michaelgilbertson/Projects/career-quest/.worktrees/claude-review-action
git worktree remove /Users/michaelgilbertson/Projects/career-quest/.worktrees/code-quality-pass
git worktree remove /Users/michaelgilbertson/Projects/career-quest/.worktrees/onet-career-explorer
```
