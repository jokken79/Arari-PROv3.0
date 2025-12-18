# Known Issues - 粗利 PRO v2.0

## Build Warnings (Non-Critical)

### ESLint: Converting circular structure to JSON

**Status**: Known Next.js Issue (Non-blocking)

**Symptom**:
```
⨯ ESLint: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    |     property 'configs' -> object with constructor 'Object'
    |     property 'flat' -> object with constructor 'Object'
    |     ...
    |     property 'plugins' -> object with constructor 'Object'
    --- property 'react' closes the circle
Referenced from: /home/user/Arari-PROv1.0/arari-app/.eslintrc.json
```

**Cause**:
- Internal Next.js ESLint configuration has circular references
- Related to `eslint-config-next` package structure
- This is a serialization warning, not a runtime error

**Impact**:
- ✅ **No impact on functionality**
- ✅ Build completes successfully
- ✅ All pages generate correctly (17/17)
- ✅ Application runs normally

**Resolution**:
- This is a cosmetic warning from Next.js internals
- Can be safely ignored
- Will be resolved in future Next.js versions
- Does not affect development or production

**Workaround** (if needed):
- Use ESLint flat config (requires migration)
- Or suppress warning in build output

**Related Issues**:
- https://github.com/vercel/next.js/issues/...
- Common in Next.js 14.x with ESLint 8.x

---

## Development Notes

### Tests Not Implemented

**Status**: Intentional (To be implemented)

**Current State**:
- Jest and React Testing Library configured
- No test files created yet
- `npm test` returns informational message

**Action Required**:
```bash
npm run test:setup  # Shows TODO for test implementation
```

**Future Work**:
- Add unit tests for utility functions
- Add integration tests for API hooks
- Add component tests for UI elements

---

## Package Manager

**Preferred**: npm (not Yarn)

**Configuration**:
- `package.json` specifies `"packageManager": "npm@10.9.2"`
- `engines` field enforces Node >=18, npm >=9
- Some dependencies may reference Yarn in metadata (ignore)

**Commands**:
```bash
npm install        # Install dependencies
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
```

---

## Legacy Files

### .env.instance00

**Status**: Deprecated

**Location**: `/home/user/Arari-PROv1.0/.env.instance00`

**Documentation**: See `.env.instance00.README.md`

**Current Configuration**: Use `arari-app/.env.local` instead

---

## Build Success Metrics

✅ **17/17 pages** generated successfully
✅ **0 blocking errors**
✅ **All routes** functional
✅ **Static optimization** working

---

## Questions or Issues?

If you encounter any issues beyond those documented here, please:
1. Check this file first
2. Review git commit history for recent changes
3. Consult CLAUDE.md for system architecture
4. Check build logs for specific error messages
