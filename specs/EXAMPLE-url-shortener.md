# Spec: URL shortener service (EXAMPLE)

**Status:** example · **Owner:** Drew · **Date:** 2026-06-23

This is a worked example of the SDD flow (`/spec` -> `/loop`). Stack: python-service.

## 1. Problem / intent
Provide a small HTTP service that shortens long URLs to stable short codes and
redirects them. Audience: a portfolio demo. Success: create + resolve round-trips
correctly and rejects bad input.

## 2. Scope
- In scope: create short code, resolve to original, basic validation, in-memory store.
- Out of scope: auth, analytics, custom domains, persistence (v1).

## 3. Acceptance criteria (EARS)
- WHEN a valid http(s) URL is submitted THE SYSTEM SHALL return a unique short code.
- WHEN an existing short code is requested THE SYSTEM SHALL redirect to the original URL.
- IF a non-URL string is submitted THEN THE SYSTEM SHALL return a 400 with a clear message.
- WHEN the same URL is submitted twice THE SYSTEM SHALL return the same short code (idempotent).
- IF an unknown short code is requested THEN THE SYSTEM SHALL return a 404.

## 4. Plan
Pure `shorten(url) -> code` + `resolve(code) -> url` domain (testable, no IO),
a thin FastAPI layer, pydantic validation at the boundary. Contract: codes are
URL-safe, length 7.

## 5. Tasks
- [ ] Domain: deterministic code generation + collision handling (unit + property tests)
- [ ] Validation: reject non-URLs (boundary tests)
- [ ] HTTP layer: POST /shorten, GET /{code} (integration tests)
- [ ] Eval: domain has no IO; idempotency invariant holds

## 6. Risks / decisions
- Code generation strategy (hash vs counter vs random) -> ADR via `/debate`.
