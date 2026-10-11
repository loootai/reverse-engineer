# Contributing

Thanks for helping. This repo is a skill pack, so most changes are to a `SKILL.md`.

## Before you open a pull request

```bash
npm run check
```

It must pass. If it reports an unknown job id, the id is not in the live looot catalog. Fix the id or remove it. If you touch `template/`, also run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` inside it.

## Rules for a skill

- The folder name and the `name` in the frontmatter are the same.
- The description says what the skill does and lists at least five phrases a user might say.
- Sections: When to use, Inputs, the steps, the looot jobs with the quote step, Output format, Failure handling, Example.
- Free steps come first. A paid step says what it costs and asks for a yes above $0.10.
- Use `job:<id>` for a looot job and only ids that exist in the catalog.
- Mark any number in an example as illustrative unless a run or a source produced it.
- Plain words, sentence case, short sentences. No em dashes. No hype.
- No internal paths, no names of private people, no tokens, no customer data.
- No unpinned `npx`. Write `npx <package>@<exact version>`.

## Rules for a case study

Use only facts from public sources or from a public repo. Tag each step observed, inferred or unknown. Say what was not tested.

## Rules for the template

Pin exact versions and run `python3` pin-guard style checks on new packages. Keep it small. A rebuild should be able to delete anything it does not need.

## Provider requests

Open a [Provider request](https://github.com/loootai/reverse-engineer/issues/new?template=provider-request.yml) issue. Search the existing ones first and add a thumbs-up or a comment instead of a duplicate.

## Leak scan

```bash
git config core.hooksPath .githooks
```

The hook runs `scripts/leak-scan.sh` before every commit.
