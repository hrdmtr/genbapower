# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands
- Build: `npm run build` 
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Format: `npm run format`
- Test all: `npm run test`
- Test file: `npm run test -- path/to/file.test.js`

## Code Style Guidelines
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Imports: group and sort alphabetically
- Naming: camelCase for variables/functions, PascalCase for classes/components
- Error handling: use try/catch with specific error types
- Prefer async/await over Promise chains
- Write unit tests for all new functionality
- Document complex functions with JSDoc comments