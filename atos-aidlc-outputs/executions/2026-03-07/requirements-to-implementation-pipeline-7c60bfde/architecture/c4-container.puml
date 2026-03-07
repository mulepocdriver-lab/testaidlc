# Database Schema Output

**Designing the Schema Now**

I'm currently focused on the database schema generation, using the Authentication Microservice Specification, Requirements Analysis, and User Story outputs as my guide. I'm prioritizing user authentication and authorization aspects first, mapping the specifications to concrete database tables and relationships. I'm carefully considering data types and indexing strategies for optimal performance.


**Outlining the Core Tables**

I've got the initial table definitions for `Users`, `Sessions`, and `AuditLogs` fleshed out, mapping specifications to database entities. The `Users` table now includes fields like `mfa_enabled`, `updated_at`, and a `status` field to indicate active/inactive accounts, based on the requirements. I'm now drafting the `Sessions` and `AuditLogs` table structures.


**Refining Entity Attributes**

I'm deep in the process of refining the attributes of my core entities, primarily the `Users`, `Sessions`, and `AuditLogs` tables. I've enriched the `Users` table with fields based on email verification, password reset, and brute-force protection requirements from the stories. Further, I am focusing on the `Sessions` table now. I've added `refresh_token`, `access_token_jti` for JWT management, the `user_agent`, and a `is_valid` flag for revocation, ensuring comprehensive session tracking.


**Outlining Table Relationships**

I'm presently outlining the relationships between the database tables. `Sessions` has a many-to-one relationship with `Users`. `AuditLogs` also has a many-to-one relationship with `Users`. I'm also considering a separate `oauth_identities` table for handling OAuth providers, which will have a many-to-one relationship with `Users`. Now, I'm defining the necessary foreign keys and considering cascade options for data integrity and efficient handling of user and session lifecycles.


**Expanding the Table List**

I'm presently building out my table list, enriched by the "Authentication Microservice Specification", the requirements, and the user stories. The tables: `Users`, `Sessions`, `AuditLogs`, `OAuth_identities`, `Token_blacklist`, and the new rate limiting tables are now defined. I'm focusing on the additional tables for brute force protection and OAuth.


**Enumerating Table Attributes**

I'm presently building out the attributes for the `Users` table and associated tables based on the specification and the requirements. I've enriched the `Users` table with fields based on email verification, password reset, and brute-force protection requirements. I am also planning the attributes for the new `OAuth_identities` and `Token_blacklist` tables.


**Defining Audit Log Attributes**

I'm presently building out the attributes for the `AuditLogs` table and considering additional logging detail. The table includes `id`, `user_id`, `action`, `ip_address`, `timestamp`, and the `details` column using `JSONB` to store action-specific context. I am making sure the details field will store the user information, and error messages, ensuring a complete audit trail.


**Structuring the Entities Now**

I'm presently building out the structural definitions for each table. I'm focusing on attributes, including data types and constraints such as `NOT NULL` and `UNIQUE`. I'm using UUIDs for primary keys where appropriate, and I'm carefully considering foreign key relationships. The process aims at 3NF normalization.


**Finalizing the Schema Details**

I am currently working on the final details of the database schema, including the SQL DDL generation. This includes defining all the data types, constraints, and relationships. Furthermore, I'm now documenting the recommended indexing strategy and considering scaling approaches for later stages. The architecture is nearly complete.


**Finalizing Table Relationships**

I'm solidifying the relationships between my database tables, and making sure that all tables are properly linked and that the proper constraints and cascade operations are in place for data integrity. The focus is to map entities with foreign keys and cascade options. I have now reviewed the relationships and I am working on the SQL schema generation.

### 1. Entities Discovered

*   `users`: Stores core user information, authentication credentials, and account status.
*   `sessions`: Manages user login sessions, linked to refresh tokens.
*   `oauth_identities`: Stores links between `users` and external OAuth/SAML providers.
*   `token_blacklist`: Records JWT access tokens that have been explicitly revoked.
*   `audit_logs`: Records significant authentication-related events for security and compliance.

### 2. ER Relationships

*   **Users to Sessions**: One user can have multiple active sessions (1:N relationship).
    *   `sessions.user_id` references `users.id`
*   **Users to OAuth Identities**: One user can be linked to multiple external OAuth/SAML identities (1:N relationship).
    *   `oauth_identities.user_id` references `users.id`
*   **Users to Audit Logs**: One user can generate many audit log entries (1:N relationship). `user_id` in `audit_logs` can be null for system-level events or failed login attempts without a known user.
    *   `audit_logs.user_id` references `users.id`
*   **Token Blacklist**: This table operates independently, storing identifiers of revoked JWT access tokens. There's no direct foreign key relationship with `sessions` or `users`, but the entries are conceptually linked to user activities and sessions.

### 3. SQL Schema

```sql
-- Table for storing user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- NULLable if user only uses OAuth
    mfa_secret VARCHAR(255), -- Stored securely, NULL if MFA not enabled
    mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_VERIFICATION' NOT NULL, -- e.g., 'PENDING_VERIFICATION', 'VERIFIED', 'LOCKED', 'DISABLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE
);

-- Index to quickly lookup users by email during login
CREATE INDEX idx_users_email ON users (email);

-- Table for storing active user sessions and refresh tokens
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed refresh token for security
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- For logical session revocation
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index to quickly lookup sessions by user_id and refresh_token_hash
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_refresh_token_hash ON sessions (refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- Table for linking users to external OAuth/SAML identities
CREATE TABLE oauth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL, -- e.g., 'google', 'github', 'microsoft', 'saml'
    provider_user_id VARCHAR(255) NOT NULL, -- Unique ID from the external provider
    email VARCHAR(255), -- Email provided by OAuth, useful for linking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE (provider, provider_user_id), -- Ensure uniqueness for a given provider
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index to quickly lookup OAuth identities by provider and provider_user_id
CREATE INDEX idx_oauth_identities_provider_user_id ON oauth_identities (provider, provider_user_id);
CREATE INDEX idx_oauth_identities_user_id ON oauth_identities (user_id);

-- Table for blacklisting JWT access tokens
CREATE TABLE token_blacklist (
    jti VARCHAR(255) PRIMARY KEY, -- JWT ID
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the token would naturally expire
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index to efficiently prune expired tokens
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist (expires_at);

-- Table for audit logging of authentication events
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- NULLable for system actions or pre-authentication failures
    action VARCHAR(100) NOT NULL, -- e.g., 'login_success', 'login_failure', 'password_change', 'mfa_enable', 'token_revoke', 'register', 'email_verified'
    ip_address INET,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    details JSONB, -- For additional structured log data
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index to query audit logs by user, action, and time range
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
```

### 4. Indexing Strategy

*   **`users` table**:
    *   `email`: Critical for login and user lookup. Unique constraint on email should automatically create an index, but an explicit index ensures optimal performance.
    *   `id`: Primary key, automatically indexed.
    *   `status`: Useful for querying active, locked, or unverified users.
*   **`sessions` table**:
    *   `user_id`: Essential for retrieving all sessions for a given user (e.g., during logout or session management).
    *   `refresh_token_hash`: Critical for validating and revoking refresh tokens.
    *   `expires_at`: Useful for cleaning up expired sessions.
    *   `id`: Primary key, automatically indexed.
*   **`oauth_identities` table**:
    *   `provider`, `provider_user_id`: Crucial for looking up an OAuth identity (and thus the associated user) given the external provider's unique ID.
    *   `user_id`: For retrieving all linked OAuth identities for a user.
    *   `id`: Primary key, automatically indexed.
*   **`token_blacklist` table**:
    *   `jti`: Primary key, essential for quick lookup during token introspection.
    *   `expires_at`: Useful for background jobs to prune expired blacklisted tokens.
*   **`audit_logs` table**:
    *   `user_id`: For filtering audit events related to a specific user.
    *   `action`: For filtering logs by event type (e.g., all 'login_failure' events).
    *   `timestamp`: For chronological queries and range-based filtering.
    *   `id`: Primary key, automatically indexed.

### 5. Scaling Considerations

*   **Partitioning**:
    *   **`audit_logs`**: This table will likely grow very large. Partitioning by `timestamp` (e.g., by month or year) can significantly improve query performance for time-based analysis and ease data retention policies.
    *   **`sessions`**: Could be partitioned by `user_id` or `expires_at` if the number of concurrent sessions becomes extremely high, to distribute load and improve cleanup efficiency.
*   **Sharding**:
    *   **`users` and related tables (`sessions`, `oauth_identities`)**: If the user base scales into hundreds of millions or billions, sharding the `users` table based on `user_id` would be necessary. All user-specific data (sessions, OAuth identities) would then reside on the same shard as the user record, maintaining data locality. This is aligned with NFR-C1 to scale horizontally.
    *   **`audit_logs`**: Can be sharded independently, potentially by `user_id` if audit queries are predominantly user-centric, or by `timestamp` for distributed logging.
*   **Caching**:
    *   **JWT Access Tokens**: JWTs are stateless by design and contain all necessary information. Caching is primarily for metadata (e.g., public keys for verification) or for quick blacklist checks.
    *   **`token_blacklist`**: Since token introspection (FR11) requires checking this list for every revoked token, a fast in-memory cache (e.g., Redis) is crucial to store active blacklisted JWT IDs to meet the NFR-P1 (< 100ms authentication response). Expired tokens from the blacklist should be periodically removed from the cache and database.
    *   **User Data (`users`, `oauth_identities`)**: Frequently accessed user profiles (`/auth/me` endpoint, FR8) or MFA status checks can be cached at the application layer or in a distributed cache (e.g., Redis, Memcached) to reduce database load and improve response times.
    *   **Rate Limiting Data**: As mentioned in the thought process, IP-based rate limiting (NFR-S1) and brute force protection tracking (`failed_login_attempts` in `users`) are best handled by a fast in-memory data store like Redis rather than the primary database for performance.
*   **Database Type**: While a relational database (PostgreSQL in this case) is suitable for ACID properties and complex relationships, consider specialized databases for specific workloads:
    *   **NoSQL for Audit Logs**: For extremely high-volume audit logs, a NoSQL database optimized for write-heavy, time-series data (e.g., Cassandra, Elasticsearch) might be considered if advanced querying and analytics are paramount and strict relational integrity is less critical.
    *   **Key-Value Store for Session/Token Data**: For very high-throughput session management (refresh tokens), a key-value store could be used to manage token hashes and expiry, reducing load on the relational database.