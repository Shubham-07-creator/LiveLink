# 🐛 LiveLink Discovered Bugs & Regressions Log

This document records all functional, security, stability, or boundary bugs uncovered by the LiveLink test suite.
Per SDET engineering rules: **production code is never silently modified**. Every issue logged here receives a dedicated reproduction test (which fails before the fix and passes after) and a standalone git fix commit.

| Bug ID | Severity | Status | Summary | Affected Component | Regression Test |
|:---:|:---:|:---:|:---|:---|:---|
| *(No active open bugs yet)* | - | - | - | - | - |

---

## 📝 Bug Report Template

```markdown
### [BUG-XXX] Title / Brief Description
- **Severity**: Critical | High | Medium | Low
- **Status**: Open | Fixed | Verified
- **Affected File & Line**: `path/to/file.js:LXX`
- **Steps to Reproduce**:
  1. ...
- **Expected Behavior**: ...
- **Actual Behavior**: ...
- **Regression Test**: `tests/...`
- **Fix Commit**: `hash`
```
