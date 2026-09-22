# @adrienlcp/result — vendored

**This is not Taverla's code.** `src/` is a byte-identical copy of
`C:/git/toolkit/packages/result/src/`, shared with Adrien's other projects.

Never edit it here. Change the library in the toolkit, then run
`pnpm toolkit:sync` from the repository root. `pnpm toolkit:check` fails when
a copy has drifted, and `pnpm validate` runs it.

Everything around `src/` — this file, `package.json`, `tsconfig.json`,
`vitest.config.ts` — is Taverla's, and is what makes the copy a workspace
package under the name it would carry on npm.
