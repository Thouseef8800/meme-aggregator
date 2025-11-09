Thank you for considering contributing to meme-aggregator.

How to contribute

- Fork the repository and create a topic branch for your changes.
- Run the test suite locally: `npm ci && npm test` and ensure lint passes: `npm run lint`.
- Open a pull request describing your changes.

Coding standards

- Follow existing TypeScript patterns. `strict: true` is enabled.
- Run ESLint and fix issues before committing.

Tests

- Add unit tests under `__tests__/`. Use Jest and prefer pure unit tests; for integration tests use a real Redis instance or docker-compose.

License

This project is MIT licensed.
- This was scaffolded as a prototype for an assignment.
- To run tests: `npm run test`
- To run dev server: `npm run dev`
