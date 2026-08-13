# File & Directory Naming: kebab-case only

> **Unscoped on purpose**: it applies when a file is *created*, and no `paths:`
> pattern matches a file that does not exist yet.

All files and directories MUST use **kebab-case** (lowercase letters, numbers, hyphens).

## Rules

- **Directories**: `my-feature/`, `cloud-space/` — never PascalCase or camelCase
- **Files**: `my-component.tsx`, `use-debounce.ts`, `app-header.tsx` — never PascalCase or camelCase
- **SASS files**: `my-component.sass` (not `.styles.sass`, not `MyComponent.sass`)
- **Test files**: `feature.test.ts` — kebab-case before `.test.ts`

## No barrel files

Do NOT create `index.ts` files that only re-export from other files. Import directly from source modules instead. Generated re-export modules use a descriptive name (e.g. `sdk.ts`), not `index.ts`.

## Exceptions

- `App.tsx` and `main.tsx` — React entry points (convention)
- Generated files keep their output name but codegen scripts must produce kebab-case

## Examples

```
# Correct
features/cloud-spaces/cloud-space-api.ts
infrastructure/authentication/fetch-middleware.ts
components/text-field.tsx

# Wrong
Features/CloudSpaces/cloudSpaceApi.ts
Infrastructure/Authentication/fetchMiddleware.ts
components/TextField.tsx
```
