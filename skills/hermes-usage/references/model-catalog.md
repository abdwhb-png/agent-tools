# Hermes Model Catalog Reference

Hermes uses provider setup plus a remote model catalog to populate curated model pickers, especially for OpenRouter and Nous Portal.

The quickstart docs state that Hermes requires models with at least 64K tokens of context. When the user reports truncation, weak tool use, or setup issues with a small model, recommend choosing a larger-context model before over-tuning other settings.

## Main Commands

Provider/model setup wizard:

```bash
hermes model
```

In-session switch among configured models:

```text
/model
/model claude-sonnet-4
/model openrouter:anthropic/claude-sonnet-4
/model custom:qwen-2.5
/model custom:local:qwen-2.5
/model claude-sonnet-4 --global
```

Scripted per-run override:

```bash
hermes -z "..." --provider openrouter --model openai/gpt-5.5
HERMES_INFERENCE_MODEL=anthropic/claude-sonnet-4.6 hermes -z "..."
hermes chat --provider openrouter --model anthropic/claude-sonnet-4.6 -q "..."
```

## `hermes model` vs `/model`

| Surface                         | What it can do                                                                                              | What it cannot do                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `hermes model` terminal command | Add providers, run OAuth flows, prompt for API keys, configure custom/self-hosted endpoints, save defaults. | It is not an in-session command; exit chat first.        |
| `/model` in chat                | Switch between already configured providers/models for current session; `--global` persists.                | Cannot add providers, run OAuth, or prompt for API keys. |

If a user only sees OpenRouter models in `/model`, tell them to exit the session and run `hermes model` to add another provider.

## Catalog Manifest

Docs identify the live catalog manifest:

```text
https://hermes-agent.nousresearch.com/docs/api/model-catalog.json
```

Local cache:

```text
~/.hermes/cache/model_catalog.json
```

If the manifest is unreachable, Hermes falls back to a local snapshot for the model list.

The docs describe the catalog as a remotely hosted manifest driving curated model picker lists for OpenRouter and Nous Portal. Entries can change independently of the static docs; use `hermes model` or the live manifest for exact current choices.

## Providers From CLI Docs

The `hermes chat --provider` docs list these providers/aliases:

| Provider                                 | Notes                                                  |
| ---------------------------------------- | ------------------------------------------------------ |
| `auto`                                   | Automatic/provider default.                            |
| `openrouter`                             | OpenRouter.                                            |
| `nous`                                   | Nous Portal.                                           |
| `openai-codex`                           | OpenAI Codex path.                                     |
| `copilot-acp`, `copilot`                 | GitHub Copilot paths.                                  |
| `anthropic`                              | Anthropic.                                             |
| `gemini`, `google-gemini-cli`            | Google Gemini.                                         |
| `huggingface`                            | Hugging Face Inference Providers.                      |
| `novita`                                 | NovitaAI.                                              |
| `zai`                                    | z.ai / ZhipuAI.                                        |
| `kimi-coding`, `kimi-coding-cn`          | Kimi/Moonshot.                                         |
| `minimax`, `minimax-cn`, `minimax-oauth` | MiniMax.                                               |
| `kilocode`                               | Kilo Code.                                             |
| `xiaomi`                                 | Xiaomi MiMo.                                           |
| `arcee`                                  | Arcee AI.                                              |
| `gmi`                                    | GMI Cloud.                                             |
| `alibaba`, `alibaba-coding-plan`         | Alibaba; `alibaba-coding-plan` alias `alibaba_coding`. |
| `deepseek`                               | DeepSeek.                                              |
| `nvidia`                                 | NVIDIA NIM.                                            |
| `ollama-cloud`                           | Ollama Cloud.                                          |
| `xai`, `xai-oauth`                       | xAI; aliases `grok`, `grok-oauth`.                     |
| `qwen-oauth`                             | Qwen OAuth.                                            |
| `bedrock`                                | AWS Bedrock.                                           |
| `opencode-zen`, `opencode-go`            | OpenCode offerings.                                    |
| `azure-foundry`                          | Microsoft Foundry / Azure OpenAI.                      |
| `lmstudio`                               | LM Studio/local.                                       |
| `stepfun`                                | StepFun.                                               |
| `tencent-tokenhub`                       | Tencent TokenHub; aliases `tencent`, `tokenhub`.       |

## Model Catalog Notes From Docs

Examples surfaced by the crawled docs included OpenRouter and Nous entries such as:

| Provider list | Example IDs mentioned                               |
| ------------- | --------------------------------------------------- |
| OpenRouter    | `moonshotai/kimi-k2.6`, `openai/gpt-5.4`            |
| Nous          | `anthropic/claude-opus-4.7`, `moonshotai/kimi-k2.6` |

Treat these as examples from the crawl, not a frozen inventory. The live catalog is authoritative.

## Config And Env Interactions

Common per-run overrides:

| Mechanism                 | Scope                                                                    |
| ------------------------- | ------------------------------------------------------------------------ |
| `-m`, `--model <model>`   | One invocation. Equivalent env var for `-z` is `HERMES_INFERENCE_MODEL`. |
| `--provider <provider>`   | One invocation.                                                          |
| `/model <model>`          | Current chat session only.                                               |
| `/model <model> --global` | Persists as default.                                                     |
| `hermes model`            | Interactive provider/model/auth setup; writes defaults.                  |
| `HERMES_MODEL`            | Process-level override used by cron; prefer config for normal use.       |
| `HERMES_INFERENCE_MODEL`  | Force model for `hermes -z` / `hermes chat` without mutating config.     |

Provider routing is config-only under `provider_routing`. Fallback providers are config-only under `fallback_providers` or managed with `hermes fallback`.

## Recommended Answers

Adding a new provider:

```bash
hermes model
```

Switching model mid-session:

```text
/model openrouter:anthropic/claude-sonnet-4
```

Persisting a default from inside a session:

```text
/model claude-sonnet-4 --global
```

CI/script override without changing config:

```bash
hermes -z "Return only JSON" --provider openrouter --model openai/gpt-5.5
```

Fallback chain:

```bash
hermes fallback list
hermes fallback add
```

Config form:

```yaml
fallback_providers:
  - provider: openrouter
    model: anthropic/claude-sonnet-4
```