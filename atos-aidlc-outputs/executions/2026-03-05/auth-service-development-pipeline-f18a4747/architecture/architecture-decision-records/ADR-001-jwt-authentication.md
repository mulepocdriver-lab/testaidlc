# ADR-001: Use JWT for Authentication

## Status
Accepted

## Context
We need to implement a scalable authentication mechanism for the User Authentication Service that supports:
- Stateless authentication
- Multiple client types (web, mobile, API)
- Easy integration with microservices

## Decision
We will use JSON Web Tokens (JWT) with RS256 algorithm for authentication.

### Token Structure
- **Access Token**: Short-lived (15 minutes), contains user claims
- **Refresh Token**: Long-lived (7 days), stored in Redis, rotated on use

### Security Measures
- RS256 asymmetric signing (private key never leaves auth service)
- Token blacklisting for logout
- Refresh token rotation
- Secure cookie storage for web clients

## Consequences

### Positive
- Stateless verification reduces database load
- Easy horizontal scaling
- Standard format understood by all services

### Negative
- Token revocation requires additional infrastructure (Redis blacklist)
- Larger payload than session IDs
- Key rotation complexity

## Alternatives Considered
1. **Session-based auth**: Rejected due to scaling complexity
2. **OAuth 2.0 only**: Too complex for internal services
3. **API Keys**: Not suitable for end-user authentication
