# Learnings Log

- **2025-11-08:** `tsconfig` uses `exactOptionalPropertyTypes`, so sandbox policy merges must clone base objects and only write optional keys when new values exist—otherwise TypeScript rejects the assignment.
- **2025-11-08:** Local npm cache (`npm_config_cache=./.npm-cache`) avoids permission errors when installing deps into this repo.
- **2025-11-08:** `exactOptionalPropertyTypes` also means optional object props shouldn't be passed as `{ prop: undefined }`; build log/event objects without the key when data is absent to keep type-checking happy.
