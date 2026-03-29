# Copilot Instructions
## Agent behaviour
- you can add files or change files without permission, but make sure to follow the guidelines in this document and the rules in `.github/copilot.yml` to ensure that the code is of high quality and maintainable. If you are unsure about a change or addition, please ask for clarification before proceeding.
These guidelines mirror the repo rules in `.github/copilot.yml` and provide human-readable direction.

## Project structure
- this project aims to improve next.js by generating next.js middlewares from an OPENAPI Spec
- Database calls should be placed in the services folder under `shared/services/`.
- Database models and interfaces should be stored in `shared/models/`.
- Screens in `frontend-app/app/` must use TypeScript (`.tsx`).
- Use reusable shared components and styles in `frontend-app/components/` — prefer shared components instead of recreating them when building new screens.
- Use shared styles from `frontend-app/constants/theme.ts` for consistent design.

## Clean code
- Keep functions small and single-purpose; extract helpers when logic grows.
- Use descriptive, consistent naming; avoid abbreviations unless established.
- Limit inline conditionals and nesting; prefer early returns for clarity.
- Avoid duplication; refactor shared logic into utilities. (DRY)
- Keep solutions simple; prefer the smallest clear implementation that works. (KISS)
- Keep side effects isolated; make data transforms pure where possible.
- Add tests when behavior changes or new logic is introduced.
- Try to reduce the amount of boilerplate code, for example by using utility functions or higher order components to abstract away common patterns and logic. This helps to keep the codebase clean and maintainable, and reduces the chances of introducing bugs or inconsistencies when adding new features or making changes to existing code.
- use imports instead of require statements for better readability and maintainability of the code. This also allows for better tree shaking and optimization of the code during the build process.
- remove any unused code or dependencies to keep the codebase clean and reduce the chances of introducing bugs or security vulnerabilities. This also helps to improve the performance of the application by reducing the amount of code that needs to be loaded and executed.
  - when creating different components, try to keep them in separate files and write the base logic in a parent component, this helps to keep the code organized and maintainable, and makes it easier to reuse components across different parts of the application. It also allows for better separation of concerns and makes it easier to test individual components in isolation.

## Component Architecture (AI-Optimized)
The following guidelines help keep component files small, which reduces the amount of code sent to AI models and improves response quality:

### Single Responsibility Components
- **Keep component files under 150 lines** - If a component exceeds this, split it into smaller sub-components.
- **One component per file** - Each file should export a single primary component with its closely related helpers.
- **Co-locate related code** - Settings, types, and constants specific to a component should live in the same file or adjacent files in the same folder.

### Component Composition Pattern
- **Build complex UIs from small primitives** - Create small, focused components and compose them into larger ones.
- **Avoid monolithic shared files** - Instead of one large file with settings/config for all components, each component should define its own settings.
- **Example structure for UI components:**
  ```
  components/designer/renderers/
  ├── TextInputRenderer.tsx      # Component + its SETTINGS export
  ├── NumberInputRenderer.tsx    # Component + its SETTINGS export
  ├── SubmitButtonRenderer.tsx   # Component + its SETTINGS export
  └── index.ts                   # Aggregates exports
  ```

### Settings & Configuration
- **Define settings alongside the component** - Each renderer/component should export its own `SETTINGS` constant.
- **Use a thin aggregation layer** - A central config file should only import and re-export, not define settings.
- **Keep settings close to usage** - When settings options (like dropdown values) are only used by one component, define them in that component's file.

### Benefits
- Smaller files = less context needed for AI to understand and modify code
- Changes are localized = less risk of unintended side effects
- Easier code review = each file has a clear, single purpose
- Better tree-shaking = unused components don't bloat the bundle

## Quality
- Ensure TypeScript code compiles without errors in `frontend-app/**` and `website/**`.
- use prettier for consistent code formatting, and make sure to run it on the code before committing. This helps to keep the codebase clean and readable, and reduces the chances of introducing formatting-related bugs or inconsistencies when adding new features or making changes to existing code.
- Add comments to explain complex logic or decisions, but avoid obvious comments.
- Remove any unused code @typescript-eslint/no-unused-vars
- always apply (import/order) eslint rule to keep imports organized and consistent. This helps to improve the readability of the code and makes it easier to find and manage dependencies. The import/order rule enforces a specific order for imports, such as grouping them by type (e.g., external, internal, sibling) and sorting them alphabetically within each group. This can help to reduce confusion and improve the overall maintainability of the codebase.
- Always fix all ESLint errors
- Always post one file in a single code view.
- add logs when adding new features or making changes to existing code, this helps to improve the observability of the application and makes it easier to debug issues when they arise. Logs can provide valuable information about the behavior of the application, such as the flow of data, the occurrence of errors, and the performance of different components. By adding logs at strategic points in the code, you can gain insights into how the application is functioning and identify areas for improvement.

## Tools usage
- when creating temp output files, do it in a temp directory located inside the workspace and make sure to clean up the files after they are no longer needed. This helps to keep the project directory clean and organized, and reduces the chances of accidentally committing temporary files to version control or leaving behind unnecessary files that can clutter the project.

