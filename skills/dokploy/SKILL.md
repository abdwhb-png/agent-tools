---
name: dokploy
description: Use when planning, deploying, or troubleshooting workloads on Dokploy. This includes choosing between Application, Docker Compose, or Swarm-style deployment models; selecting Nixpacks, Dockerfile, Static, or prebuilt-image workflows; configuring domains, HTTPS, environment variables, and persistence; and recommending CI/CD, remote-server, or zero-downtime rollout strategies. Use this whenever the user mentions Dokploy directly or describes a Dokploy-hosted app and needs platform decisions rather than generic Docker advice.
---

# Dokploy

Dokploy is a self-hosted PaaS built around Docker, Traefik, and a web control plane. Use it to deploy single applications, Docker Compose stacks, domains, SSL, and operational workflows without building a full platform layer from scratch.

Docs: https://docs.dokploy.com/docs/core

Read the supporting references based on the user's problem:

- For Application vs Docker Compose vs Stack and build-type choices, read [rules/build-types.md](rules/build-types.md).
- For installation, domains, environment variables, volumes, CI/CD, zero-downtime, remote servers, and security, read [rules/operations.md](rules/operations.md).
- For exact operational commands and deeper platform details, read [deployment-reference.md](deployment-reference.md).
- For build-type specifics, read [dockerfile-reference.md](dockerfile-reference.md), [nixpacks-reference.md](nixpacks-reference.md), or [static-reference.md](static-reference.md).

## When To Use This Skill

Use this skill when the user needs Dokploy-specific judgment, not generic container advice. Typical cases:

- They need help deciding how a repo should be deployed on Dokploy.
- They are unsure whether to use Application, Docker Compose, or Swarm.
- They need to choose between Nixpacks, Dockerfile, Static, or image-based delivery.
- They are configuring domains, HTTPS, ports, environment variables, or volumes in Dokploy.
- They are planning CI/CD, webhooks, remote servers, or zero-downtime deployment behavior.
- They are debugging a Dokploy symptom such as 502s, broken domains, missing env vars, or lost files after redeploy.

## Working Style

Drive the answer through a fixed decision order so the recommendation is easy to audit:

1. **Choose deployment mode**: Application first, Docker Compose only when the service graph matters.
2. **Choose build type**: Nixpacks for convenience, Dockerfile for control, Static for generated assets.
3. **Set runtime contract**: container port, environment variables, volumes, health check.
4. **Attach ingress**: domain, HTTPS certificate, path behavior.
5. **Choose rollout path**: on-server build for small/simple work, CI/CD + registry for production.
6. **Harden only if needed**: remote servers, cluster/Swarm, direct UI exposure rules.

If the user did not provide enough detail, ask only for the missing inputs that would change the recommendation:

- Is the workload one deployable app or a multi-service topology?
- Is the output static files, a long-running server, or multiple long-running processes?
- Is this a quick internal deploy or a production rollout that needs reproducibility and safer upgrades?
- Does the app need persistence, custom networking, or companion services?

## Response Contract

When giving a Dokploy recommendation, structure the answer in this order:

1. **Recommended Dokploy mode**: Application, Docker Compose, or Stack.
2. **Recommended build path**: Nixpacks, Dockerfile, Static, or prebuilt Docker image.
3. **Why this fits**: tie the choice back to the app shape and operational constraints.
4. **Required Dokploy settings**: container port, publish directory, env wiring, volume strategy, health check, domain rules.
5. **Production caveats**: CI/CD, rollout safety, remote server or Swarm concerns if relevant.
6. **Next steps**: concise, executable actions.

Do not stop at naming a build type. Tell the user what they need to configure in Dokploy for the choice to work.

| Need | Choose | When |
| --- | --- | --- |
| Fast single-app deploy | `Application` + `Nixpacks` | Conventional app, low setup, quick iteration |
| Production app deploy | `Application` + `Dockerfile` | Need exact image, reproducible runtime, multi-stage build |
| Static frontend | `Application` + `Static` | Build output is static files served from NGINX |
| Existing multi-service topology | `Docker Compose` | Repo already defines multiple services and networking |
| Safe production rollout | CI/CD + image deploy | Build load should not run on the Dokploy host |
| Horizontal scaling | Cluster / Swarm | Scaling requirement is explicit, not assumed |

## Core Rules

- Default to **Application** unless the user truly needs Compose.
- Default to **Dockerfile** for production recommendations.
- Use **Static** only when the app produces static output; static domains must target **port 80**.
- Treat **Nixpacks** as the convenience path, not the most controlled production path.
- If the user already has a reliable CI pipeline and registry, prefer image deployment over rebuilding on the Dokploy host.
- For Docker Compose, remember Dokploy-managed `.env` values may still need `env_file` or explicit `${VAR}` wiring.
- For persistent files, prefer `../files/...` bind mounts or named volumes.
- Only recommend zero-downtime behavior when a real health check and rollback-capable update strategy are present.

## Recommendation Patterns

Use these defaults unless the user's constraints clearly point elsewhere:

- **Laravel or other server runtime headed for production**: `Application` + `Dockerfile`, then add health checks and CI-built images.
- **Simple Node or PHP app for fast setup**: `Application` + `Nixpacks`.
- **Vite or other generated frontend artifact**: `Application` + `Static` when the output is only built files.
- **Existing repo whose value is its compose topology**: `Docker Compose`.
- **User asks about horizontal scaling or Swarm explicitly**: consider `Stack`, but treat it as an explicit escalation rather than the default.

## Troubleshooting Order

When debugging an existing deployment, narrow the failure in this order:

1. Confirm the deploy mode matches the workload shape.
2. Confirm the runtime contract is correct: listener port, publish directory, env wiring, and persistence.
3. Confirm ingress is correct: DNS, domain host/path, HTTPS, Traefik routing.
4. Confirm rollout behavior: health checks, build pressure on host, redeploy requirements for Compose labels.
5. Only then escalate to remote-server, cluster, or security-hardening concerns.

## Quick Checks

- **Domain broken**: verify DNS, Traefik routing, and correct container port.
- **502 during deploy**: check app listener, health endpoint, and rollout strategy.
- **Build stalls server**: move builds to CI/CD.
- **Files disappear after deploy**: fix the volume strategy.
- **Static app fails behind domain**: confirm publish directory and port 80.

## Common Mistakes

- Recommending Docker Compose for a simple single-service app.
- Using Static for SSR or a server runtime.
- Treating on-host builds as the production default.
- Forgetting that Compose domain changes usually require redeploy.
- Claiming zero-downtime without requiring a real health check.
