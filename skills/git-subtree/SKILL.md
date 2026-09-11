---
name: git-subtree
description: Use when adding, updating, publishing, extracting, inspecting, or removing Git subtrees; when synchronizing a directory with another Git repository using `git subtree`; or when deciding how to safely run `git subtree add`, `pull`, `push`, `split`, or `merge`.
compatibility: Requires Git with the `git subtree` command available.
metadata:
category: git
scope: repository-management
---

# Git Subtree

Manage Git subtrees safely and deterministically.

A Git subtree embeds another repository's files directly inside a directory of the current repository while preserving the ability to synchronize that directory with an external Git repository.

Use `git subtree`, not Git submodules, when the repository should remain fully usable after a normal clone without requiring submodule initialization.

## Core rules

1. Inspect the repository before mutating it.
2. Never assume a directory is a subtree only because it looks like one.
3. Never convert a submodule into a subtree, or a subtree into a submodule, unless explicitly requested.
4. Never force-push subtree history unless explicitly requested.
5. Never automatically stash, discard, reset, clean, or overwrite unrelated local changes.
6. Never rewrite repository history merely to manage a subtree.
7. Preserve the subtree's existing synchronization style when it can be determined.
8. Prefer `--squash` for a newly added third-party subtree unless the user explicitly needs the complete upstream history.
9. Do not add or modify Git remotes unless doing so is useful and requested. `git subtree` can operate directly against repository URLs.
10. Treat subtree synchronization as a repository mutation. Verify the result after every mutation.

## Terminology

Use these names consistently:

- **parent repository**: the repository currently being operated on
- **subtree repository**: the external repository synchronized with the subtree
- **prefix**: directory inside the parent repository containing the subtree
- **remote ref**: branch, tag, or commit imported from the subtree repository
- **upstream**: the external subtree repository
- **local subtree changes**: commits in the parent repository that modify files under the prefix

Example:

```text
parent-repository/
├── src/
├── package.json
└── packages/
    └── shared-ui/     <- subtree prefix
```

Here:

```text
prefix = packages/shared-ui
```

## Step 1: Inspect before acting

Before any subtree operation, determine the repository state.

Run:

```bash
git rev-parse --show-toplevel
git status --short
git branch --show-current
git --version
git subtree --help >/dev/null
```

If `git subtree` is unavailable, stop and report that Git's subtree command is unavailable.

Do not silently install software.

For mutating operations, require a clean working tree unless the operation is specifically intended to include current uncommitted changes.

If there are unrelated uncommitted changes, stop and report them.

Do not automatically run:

```bash
git stash
git reset
git checkout -- .
git restore .
git clean
```

## Step 2: Inspect existing subtree metadata

`git subtree` records metadata in commit messages using trailers such as:

```text
git-subtree-dir: packages/shared-ui
git-subtree-split: <commit>
git-subtree-mainline: <commit>
```

To inspect a specific prefix:

```bash
git log \
  --grep="^git-subtree-dir: packages/shared-ui/*$" \
  --format='%H%n%B%n---'
```

To discover known subtree prefixes:

```bash
git log --all --format='%B' |
  sed -n 's/^git-subtree-dir: //p' |
  sort -u
```

A directory existing in the worktree is not sufficient evidence that it is a subtree.

If no subtree metadata exists but the user explicitly states that the directory is managed as a subtree, continue cautiously.

Otherwise do not assume it is one.

## Operation selection

Map the user's intent to exactly one primary operation.

| Intent                                                  | Operation |
| ------------------------------------------------------- | --------- |
| Import another repository into a directory              | `add`     |
| Bring upstream changes into an existing subtree         | `pull`    |
| Publish local subtree changes upstream                  | `push`    |
| Extract a directory's history into subtree-only history | `split`   |
| Merge an already available subtree commit               | `merge`   |
| Inspect subtree configuration/history                   | inspect   |
| Delete subtree files from parent repository             | remove    |

Do not use `split` when the user only wants to update a subtree.

Do not use `push` when the user only wants to update the parent from upstream.

---

# Add a subtree

Use when importing an external repository for the first time.

## Preconditions

Verify:

```bash
git status --short
test ! -e "<prefix>" || test -d "<prefix>"
```

Inspect the target prefix before proceeding.

Do not overwrite an existing unrelated directory.

If the prefix already contains files and there is no evidence it is an existing subtree, stop.

## Default

For normal dependency/vendor/shared-code imports, prefer:

```bash
git subtree add \
  --prefix="<prefix>" \
  "<repository>" \
  "<branch>" \
  --squash
```

Example:

```bash
git subtree add \
  --prefix="packages/shared-ui" \
  git@github.com:example/shared-ui.git \
  main \
  --squash
```

`--squash` imports the upstream state without importing every upstream commit into the parent repository.

## Full-history mode

Use full history only when explicitly required:

```bash
git subtree add \
  --prefix="<prefix>" \
  "<repository>" \
  "<branch>"
```

Do not arbitrarily change between squash and full-history workflows later.

## Verify

After adding:

```bash
git status
git log -1 --stat
git log -1 --format='%B'
test -d "<prefix>"
```

Confirm that the generated commit contains the expected subtree metadata.

---

# Pull upstream changes

Use when the subtree repository changed and those changes need to be imported into the parent repository.

## Preconditions

Verify:

```bash
git status --short
test -d "<prefix>"
```

Inspect existing subtree history:

```bash
git log \
  --grep="^git-subtree-dir: <prefix>/*$" \
  --format='%H%n%B%n---'
```

## Squashed subtree

If the subtree is managed using squash:

```bash
git subtree pull \
  --prefix="<prefix>" \
  "<repository>" \
  "<branch>" \
  --squash
```

Example:

```bash
git subtree pull \
  --prefix="packages/shared-ui" \
  git@github.com:example/shared-ui.git \
  main \
  --squash
```

## Full-history subtree

If the subtree uses full history:

```bash
git subtree pull \
  --prefix="<prefix>" \
  "<repository>" \
  "<branch>"
```

## Conflicts

If Git reports merge conflicts:

1. Identify the conflicted files:

```bash
git status --short
git diff --name-only --diff-filter=U
```

2. Do not discard either side automatically.

3. Resolve conflicts only when the intended result is clear from repository context.

4. If the correct resolution is ambiguous, stop and report the conflicting files and competing changes.

5. After resolving:

```bash
git add <resolved-files>
git commit
```

6. Run the project's relevant validation commands when available.

## Verify

Run:

```bash
git status
git log -1 --stat
git diff HEAD^ HEAD -- "<prefix>"
```

Confirm that changes outside the prefix are only expected Git subtree merge metadata/commit effects.

---

# Push local subtree changes upstream

Use when commits made in the parent repository under the subtree prefix should be published back to the external subtree repository.

`git subtree push` internally creates subtree-only history and pushes it.

## Preconditions

Verify:

```bash
git status --short
test -d "<prefix>"
```

Ensure all intended subtree changes are committed.

Inspect commits affecting the subtree:

```bash
git log --oneline -- "<prefix>"
```

If network access is available, inspect the destination before pushing:

```bash
git ls-remote "<repository>" "<branch>"
```

## Push

Run:

```bash
git subtree push \
  --prefix="<prefix>" \
  "<repository>" \
  "<branch>"
```

Example:

```bash
git subtree push \
  --prefix="packages/shared-ui" \
  git@github.com:example/shared-ui.git \
  main
```

Do not add `--force`.

Do not force-push if the remote rejects the update.

If the remote has diverged, stop and inspect both histories before deciding whether to pull, merge, rebase synthetic subtree history, or use another strategy.

## Verify

If network access is available:

```bash
git ls-remote "<repository>" "<branch>"
```

Report the pushed subtree commit and destination branch.

---

# Split subtree history

Use when extracting the history affecting a directory into a standalone Git-compatible history.

This is useful when:

- converting an existing directory into its own repository;
- inspecting subtree-only history;
- preparing an explicit branch before publishing;
- extracting a package from a monorepo.

## Create subtree-only commit

```bash
git subtree split \
  --prefix="<prefix>"
```

The command prints the resulting synthetic commit ID.

## Create a branch

```bash
git subtree split \
  --prefix="<prefix>" \
  --branch="<temporary-branch>"
```

Example:

```bash
git subtree split \
  --prefix="packages/shared-ui" \
  --branch="shared-ui-split"
```

The branch must not already exist.

Before creating it, check:

```bash
git show-ref --verify --quiet refs/heads/shared-ui-split
```

If it exists, do not delete or overwrite it automatically.

## Push an explicit split branch

```bash
git push "<repository>" \
  "<temporary-branch>:<remote-branch>"
```

Example:

```bash
git push git@github.com:example/shared-ui.git \
  shared-ui-split:main
```

Remove temporary branches only when safe and useful:

```bash
git branch -d shared-ui-split
```

Do not use `-D` unless explicitly justified.

---

# Merge a subtree commit

Use `merge` only when the desired subtree commit is already locally available and a direct merge is preferable to `pull`.

Squashed:

```bash
git subtree merge \
  --prefix="<prefix>" \
  --squash \
  "<commit>"
```

Full history:

```bash
git subtree merge \
  --prefix="<prefix>" \
  "<commit>"
```

Prefer `pull` when the source is an external repository and remote ref.

---

# Remove a subtree

Git does not provide a dedicated `git subtree remove` command.

Removing a subtree from the parent repository means deleting its files and committing the deletion.

## Preconditions

Verify:

```bash
git status --short
test -d "<prefix>"
```

Confirm through subtree metadata or explicit user instruction that the prefix is the intended subtree.

## Remove

Run:

```bash
git rm -r "<prefix>"
git commit -m "Remove <prefix> subtree"
```

This removes the subtree from the current tree.

It does **not**:

- delete the upstream repository;
- rewrite old parent repository history;
- erase previous subtree commits;
- delete Git remotes.

Do not attempt to purge subtree history unless the user explicitly requests repository history rewriting.

---

# Inspect subtree state

When the user asks what subtrees exist or how one is configured, do not mutate the repository.

## List known prefixes

```bash
git log --all --format='%B' |
  sed -n 's/^git-subtree-dir: //p' |
  sort -u
```

## Inspect latest metadata for one prefix

```bash
git log \
  --grep="^git-subtree-dir: <prefix>/*$" \
  --format='%H%n%ad%n%s%n%b%n---' \
  --date=iso
```

## Inspect changes affecting prefix

```bash
git log --oneline --decorate -- "<prefix>"
```

## Inspect current tree

```bash
git status --short -- "<prefix>"
git diff -- "<prefix>"
git diff --cached -- "<prefix>"
```

Do not claim that Git stores the subtree's remote URL or branch as persistent subtree configuration unless repository-specific configuration explicitly does so.

The commit trailers primarily identify subtree directory and split history.

If the upstream repository or branch cannot be determined from repository evidence, report that fact rather than guessing.

---

# Working with named Git remotes

A subtree repository may be referenced directly:

```bash
git subtree pull \
  --prefix="packages/shared-ui" \
  git@github.com:example/shared-ui.git \
  main \
  --squash
```

or through an existing Git remote:

```bash
git subtree pull \
  --prefix="packages/shared-ui" \
  shared-ui \
  main \
  --squash
```

Inspect remotes:

```bash
git remote -v
```

Inspect one remote:

```bash
git remote get-url shared-ui
```

Do not create a new remote merely because a subtree exists.

If the user wants a persistent remote, add it explicitly:

```bash
git remote add shared-ui \
  git@github.com:example/shared-ui.git
```

Before adding:

```bash
git remote get-url shared-ui
```

If that name already exists with another URL, do not overwrite it automatically.

---

# Choosing squash vs full history

## Prefer `--squash` when

- the subtree is a dependency;
- upstream has a large or noisy history;
- parent-repository users mostly care about imported versions;
- the same upstream project may appear more than once;
- a compact parent history is preferred.

## Prefer full history when

- upstream commit history needs to remain directly visible in the parent;
- preserving upstream ancestry is important;
- maintainers frequently investigate or merge individual upstream commits.

For an existing subtree, preserve its established mode.

Do not switch modes merely for convenience.

---

# Local changes inside a subtree

Files inside a subtree are normal tracked files in the parent repository.

Developers may edit them directly:

```bash
edit packages/shared-ui/src/button.ts

git add packages/shared-ui/src/button.ts
git commit -m "Fix shared UI button"
```

Those changes exist first in the parent repository.

To publish them upstream:

```bash
git subtree push \
  --prefix="packages/shared-ui" \
  "<repository>" \
  "<branch>"
```

Do not tell users that they must `cd` into the subtree and commit from a separate Git repository. A subtree directory is not a separate Git working tree.

---

# Commit hygiene

When commits are intended to be published upstream through subtree splitting, prefer commits that isolate subtree changes.

Prefer:

```text
fix(shared-ui): correct disabled button state
```

with changes only under:

```text
packages/shared-ui/
```

Avoid unnecessarily mixing:

```text
packages/shared-ui/...
src/application/...
infrastructure/...
```

in the same commit.

Mixed commits can still be split: `git subtree split` keeps the subtree-relevant part of the commit. But isolated commits make review and synchronization easier.

Do not rewrite already-shared history solely to improve subtree commit purity.

---

# Safety checks

Before mutation:

```bash
git rev-parse --is-inside-work-tree
git status --short
git branch --show-current
```

Before operating on a prefix:

```bash
git ls-files "<prefix>" | head
```

Before using a named remote:

```bash
git remote get-url "<remote>"
```

Before creating a split branch:

```bash
git show-ref --verify \
  "refs/heads/<branch>"
```

After mutation:

```bash
git status
git log -1 --stat
```

For subtree-specific verification:

```bash
git diff HEAD^ HEAD -- "<prefix>"
```

---

# Destructive-operation policy

Never perform any of these merely to make a subtree command succeed:

```bash
git reset --hard
git clean -fd
git clean -fdx
git checkout -- .
git restore .
git branch -D
git push --force
git push --force-with-lease
git filter-branch
git filter-repo
```

These operations require a separate justification and explicit user intent when they may destroy or rewrite work.

Do not silently resolve an unsafe state by deleting files, branches, commits, or remotes.

---

# Failure handling

When a subtree command fails:

1. Preserve the current repository state.
2. Capture the exact Git error.
3. Inspect:

```bash
git status
git log -5 --oneline --decorate
```

4. Inspect the prefix:

```bash
git status --short -- "<prefix>"
git log -10 --oneline -- "<prefix>"
```

5. If relevant, inspect subtree metadata:

```bash
git log \
  --grep="^git-subtree-dir: <prefix>/*$" \
  --format='%H%n%B%n---'
```

6. Diagnose from evidence.

Do not repeatedly retry the same command without understanding the failure.

---

# Common workflows

## Add dependency

```bash
git subtree add \
  --prefix="vendor/tool" \
  https://github.com/example/tool.git \
  main \
  --squash
```

## Update dependency

```bash
git subtree pull \
  --prefix="vendor/tool" \
  https://github.com/example/tool.git \
  main \
  --squash
```

## Modify shared package locally and publish

```bash
git add packages/shared-lib
git commit -m "fix(shared-lib): correct parser behavior"

git subtree push \
  --prefix="packages/shared-lib" \
  git@github.com:example/shared-lib.git \
  main
```

## Extract monorepo package

```bash
git subtree split \
  --prefix="packages/sdk" \
  --branch="sdk-export"

git push git@github.com:example/sdk.git \
  sdk-export:main
```

## Remove subtree

```bash
git rm -r vendor/tool
git commit -m "Remove vendor/tool subtree"
```

---

# Decision rules

When the task is ambiguous, derive the operation from evidence.

```text
External repo -> parent for first time
    => add

External repo -> existing parent subtree
    => pull

Parent subtree -> external repo
    => push

Parent directory -> standalone history
    => split

Delete subtree from parent
    => git rm, not `git subtree remove`

Need information only
    => inspect, do not mutate
```

If repository URL, branch, or prefix is genuinely unknown and cannot be determined from repository context, report the missing value instead of inventing it.

---

# Reporting

After completing an operation, report only the important result:

```text
Operation: pull
Prefix: packages/shared-ui
Upstream: git@github.com:example/shared-ui.git
Ref: main
Mode: squash
Result: updated successfully
Commit: abc1234
```

For failures, report:

```text
Operation: push
Prefix: packages/shared-ui
Result: stopped
Reason: remote branch has diverged
Repository state: unchanged
Next decision required: integrate remote changes before pushing
```

Never claim synchronization succeeded without checking the command exit status and resulting Git state.
