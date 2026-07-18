---
name: docker-image-pinning
description: |
  Pin base images by digest (sha256:...) instead of tag for reproducible and supply-chain-safe
  builds. Covers why tags drift, how to fetch a digest with docker buildx imagetools inspect,
  and how to pin both official and internal images.
---

# Image Pinning: Digests Over Tags

This rule covers correction **#5 from the parent skill**. Read it when the user mentions reproducibility, supply chain, "pin the base image", or a build that "suddenly broke" when nothing in their code changed.

## Why Tags Are a Problem

A Docker tag is **not** a permanent pointer. It is a label that image authors can move at any time.

| Tag motion | Who does it | What happens to your build |
| --- | --- | --- |
| `:latest` moves | Image maintainers, frequently (every release) | Image changes overnight |
| `:nightly` moves | Often automated | Same |
| `:26-slim`, `:3.12-slim`, etc. | Less commonly, but still moves on patch releases, security rebuilds, and maintainer discretion | Subtle changes — could be a CVE patch (good) or a behavior change (bad) |
| `:26` accidental move | Sometimes a misconfigured CI pipeline republishes a tag | Could be malicious if registry compromise |
| Internal tags like `myteam/api:stable` | Your own engineers | Far more accident-prone than upstream; protect against this explicitly |

When a tag moves under you:

- **Your build "suddenly broke"** even though you changed nothing. Hard to debug.
- **A CVE patch landed without testing on your app.** Sometimes good (security), sometimes bad (compatibility).
- **A malicious actor republished a tag.** Worst case. Rare for official images, more plausible for internal registries and small ecosystem images.

## The Fix: Pin by Digest

Every image, regardless of which tag it was published under, has an immutable **content-addressed digest** of the form `sha256:<64 hex chars>`. Pin your `FROM` lines to that.

### How to fetch the digest

```bash
docker buildx imagetools inspect node:22-slim
```

Sample output (truncated):

```
Name:      docker.io/library/node:22-slim
MediaType: application/vnd.oci.image.index.v1+json
Manifests:
  Name:      docker.io/library/node:22-slim@sha256:1a5e2d8f7b3c4e6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
  ...
```

Take that `@sha256:...` string and put it in the Dockerfile:

```dockerfile
FROM node:22-slim@sha256:1a5e2d8f7b3c4e6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
```

Now the build is fully reproducible — the same `Dockerfile` always pulls the exact same image bytes. To upgrade, you change the digest (and re-run `imagetools inspect` to find the new one).

### Keep the tag too

Pin **both** tag and digest:

```dockerfile
FROM node:22-slim@sha256:1a5e2d8f7b3c4e6f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2
```

The tag in this case is documentation telling humans "this is Node 22 slim". The digest is the source of truth. (You cannot have `node@sha256:...` without a tag in `FROM`; that's invalid Dockerfile syntax.)

### Pin every `FROM`

Each `FROM` line in a multi-stage Dockerfile should be pinned. Builder-stage drift doesn't ship to prod but it does affect build reproducibility and CI cost.

### Internal images matter most

Official images (node, python, golang, postgres, nginx, etc.) are maintained by Docker, Inc. and the broader community. Tag drift is documented and intentional.

**Internal images** at companies are different. Engineers republish tags carelessly, a hotfix reuses a tag that's supposed to be "stable", a CI pipeline accidentally republishes `latest`. For your own images:

- Treat every internal image tag as movable and pin the digest.
- Consider a release process where tag = alias and `sha256:...` = version. e.g. publish `myteam/api:2024.07.17` AND `myteam/api:2024.07.17@sha256:...`.

## Tooling

- **`docker buildx imagetools inspect <image>`** — fetch the digest of any image in any registry. This is what you'll use 95% of the time.
- **[Renovate](https://docs.renovatebot.com/)** or **[Dependabot](https://docs.github.com/en/code-security/dependabot)** — automate opening PRs that bump the pinned digest when a new version is published.
- **Image scanners** (Trivy, Snyk, Aqua) — surface known-CVE digests to avoid pinning.

## Common Mistakes

- **Pinning only one `FROM` of a multi-stage Dockerfile.** The other stages can still drift.
- **Removing the tag when pinning the digest.** Removes the human-readable hint about what the image is.
- **Pinning to `:latest` and then to `@sha256:...` from `:latest`.** Works, but the moment you refresh the digest you've silently jumped a major version.
- **Trusting internal images more than upstream.** It's the opposite — upstream has thousands of eyes, internal images have one team under deadline.
- **Never automating digest updates.** Pinning forever means you also pin every CVE forever. Pair pinning with Renovate/Dependabot.

## Anti-Pattern: Pinning to a Manifest List Digest by Hand

Some tools (older versions of buildx) only print the **manifest list** digest, not the per-platform digest. If you pin to the manifest list digest, you're fine — Docker picks the right platform-specific image automatically. Just make sure you copied the digest from `imagetools inspect`, not from `docker image inspect` (which prints the local single-arch digest and won't resolve correctly on other machines).
