# File and directory naming: kebab-case

> **Unscoped on purpose**: it applies when a file is *created*, and no `paths:`
> pattern matches a file that does not exist yet.

Every file and directory is kebab-case — lowercase letters, numbers, hyphens:
`features/host/`, `host-console-page.tsx`, `host-console-page.sass`,
`clock-sync.test.ts`. A stylesheet takes its component's name and nothing else
(not `.styles.sass`).

`App.tsx` and `main.tsx` keep their React entry-point names. A generated file
keeps whatever its generator emits, and the generator is what gets fixed.

**No barrel `index.ts`.** A module that only re-exports is not created here;
import from the source file. A generated re-export module takes a descriptive
name (`sdk.ts`).
