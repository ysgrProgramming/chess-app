## Overview
Closes #<issue_number>

## TDD & Lint Verification
- [ ] I have written failing tests (Red) and confirmed `make test` fails for the new tests.
- [ ] I have implemented code to pass tests (Green) and confirmed `make test` passes.
- [ ] I have run `make lint` and fixed all errors.

## Self-Walkthrough (Logical Reasoning)
<!-- 
CRITICAL: Explain WHY you wrote this code. 
Map specific Requirements (R1, R2, ...) from the Issue to your Code logic.
-->

| Requirement (ID) | Implementation & Logic | Key File/Function |
| :--- | :--- | :--- |
| R1: (e.g. User Auth) | Used Session-based auth instead of JWT to strictly follow R1... | `src/auth.py` |
| ... | ... | ... |

## Decision Log
<!-- 
Any technical decisions, trade-offs, or alternatives considered.
e.g., "Chose library X over Y because ...", "Deferred optimization Z to a future refactor Issue".
-->