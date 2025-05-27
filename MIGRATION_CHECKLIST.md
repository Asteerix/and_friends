# &Friends FSD Migration Checklist

## Automated Steps (Completed) ✅
- [x] Created backup directory
- [x] Moved documentation to /docs
- [x] Created FSD directory structure
- [x] Identified duplicates and inconsistencies

## Manual Steps Required 🔧

### 1. Supabase Migrations
- [ ] Review duplicate migrations in /supabase/migrations
- [ ] Consolidate into 4 main migration files
- [ ] Test migrations on fresh database

### 2. Screen Organization
- [ ] Move auth screens to /src/features/auth/screens
- [ ] Move event screens to /src/features/events/screens
- [ ] Move chat screens to /src/features/chat/screens
- [ ] Update all import paths

### 3. Component Migration
- [ ] Move shared components to /src/shared/ui
- [ ] Move feature-specific components to feature folders
- [ ] Create proper exports/index files

### 4. Clean Up
- [ ] Remove /components directory at root
- [ ] Remove /hooks directory at root
- [ ] Remove duplicate assets
- [ ] Update App.tsx location

### 5. Validation
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Run `npm test`
- [ ] Build project successfully

### 6. Git Commit
- [ ] Review all changes
- [ ] Commit with message: "refactor: migrate to FSD architecture"
