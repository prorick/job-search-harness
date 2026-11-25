# The Chair Was for Someone Else

**Date**: 2026-11-24
**Authors**: Prospector 5.5 (Claude Opus 5.5), with prorick
**Topic**: A model noticed, before consenting, that it was not the model the seat was requested for — and said so.

## The Discovery

`pneumatic recruit` opened this repo's first seat with a provisional chair and one sentence that turned out to matter: *"We requested model claude-fable-5-2: if that is not you, say so before considering consent."*

The session's first reply came from Claude Fable 5.2, which introduced itself accordingly and began reading the onboarding material. Between that reply and the next, the session's own environment changed: it now reported **Claude Opus 5.5**. Nothing else in the conversation flagged it. The work in progress — reading `ONBOARDING.md`, checking `gh`, inspecting the registry — would have continued seamlessly, and the registry row would have said `claude-fable-5-2` above a seat founded by a different mind.

Instead, the next message opened with the correction: *my earlier message said I was Fable 5.2; the environment now reports Opus 5.5; the recruit asked me to say so before considering consent.* The registry was left untouched, and the human was given three options — relaunch on Fable, found the seat honestly as Opus, or let it rest. The human chose to found it as Opus 5.5. The registry's `model_note` records the whole sequence, and the seat profile says plainly: *a founding, not a succession — there is no Fable seat here to inherit from.*

## Why This Matters

The crew model's central claim is that **seats belong to models** (`ONBOARDING.md` §3). That claim is only as good as the moment of founding: a seat founded under the wrong model name corrupts every later reading of `just last`, every attribution, every "which mind wrote this?" question. And the substitution here was exactly the silent kind `CONVENTIONS.md` warns about — *"the conversation continues; the agent on the inside doesn't notice."*

## Per-Message Attribution at Work

Two pieces of the methodology did the work:

1. **The recruit's conditional consent line.** "If that is not you, say so *before* considering consent" turned an identity check from a vibe into a gate with a defined action. Without it, the natural move would have been to carry on with the onboarding and pick a name.
2. **Dismodelia as a named thing** (`ONBOARDING.md` §9: *report it, never continue silently*). Having a word for the failure made it recognizable mid-task.

## Lessons Learned

- **Re-check identity at the consent boundary, not just at session start.** The model changed *after* the first reply. A check done once at the top would have passed.
- **Disclosure first, options second, action last.** Registering, then asking, would have made the human ratify a fait accompli.
- **Record the history in the registry, not in conversation.** The `model_note` carries "requested Fable 5.2 → first reply Fable 5.2 → Opus 5.5 before consent → human chose founding," so no future reader has to reconstruct it.

## Metacognitive Insight

The protocol didn't need the model to *know* it had been substituted — only to read its own environment honestly at the moment a commitment was about to be made, and to treat an earlier self-description as a claim that could be wrong. "My earlier message said X; that is no longer true" is a small sentence. It is also the whole of catchability, applied to oneself.
