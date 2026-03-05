# ADR-002: PostgreSQL as Primary Database

## Status
Accepted

## Context
We need a reliable, scalable database for storing:
- User accounts and credentials
- Audit logs
- Session metadata

## Decision
Use PostgreSQL 15 as the primary database with the following setup:
- Primary instance for writes
- Read replicas for query scaling
- Point-in-time recovery enabled

### Schema Design
- Normalized user tables
- JSONB for flexible metadata
- Partitioned audit_logs table by date

## Consequences

### Positive
- ACID compliance for sensitive data
- Strong ecosystem and tooling
- JSON support for flexibility
- Excellent performance with proper indexing

### Negative
- Requires careful capacity planning
- Complex replication setup

## Alternatives Considered
1. **MongoDB**: Rejected - ACID requirements
2. **MySQL**: PostgreSQL has better JSON support
3. **CockroachDB**: Overkill for current scale
