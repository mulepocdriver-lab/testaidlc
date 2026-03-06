# Database Schema Output

**Planning Authentication Service Design**

I'm currently reviewing the "Original Specification," "Requirements Analysis," and "User Story Generation" documents to extract entities for the authentication microservice. My focus is on identifying key objects like Users, Sessions, and Roles. I'm prioritizing the relationships between these entities and how they will interact.


**Outlining Database Tables**

I'm presently building out the database schema, focusing on the discovered entities. I'm detailing tables for Users, Sessions, AuditLogs, UserMfaMethods, UserOAuthAccounts, PasswordResetTokens, and EmailVerificationTokens. The next step is to define the specific fields and data types for each entity.


**Developing Schema & Relationships**

I'm now deep in the SQL schema design phase. Building on my initial entity identification, I'm creating `CREATE TABLE` statements for each entity. Data types, keys, and normalization are my immediate focus. I'm also mapping out the relational structure and defining foreign key constraints to represent connections, like one-to-many relationships for user sessions and audit logs.


**Formulating Entity Definitions**

I'm presently building the User entity's attributes. I'm focusing on attributes pulled from the specification and requirements, creating fields for authentication methods, and account security. I'm considering normalization by either creating a `UserOAuthProviders` table or adding specific OAuth fields directly to the `User` table, leaning towards the latter for initial simplicity. Next, I'll move on to the `Sessions` entity.


**Formulating Entities and Attributes**

I've outlined the entities, and am now detailing attributes. For users, I'm defining core fields like email, password, MFA, and timestamps. I'm choosing a separate `ExternalIdentities` table for OAuth providers and SAML, offering better organization. Next, I'll define Session attributes, including refresh token storage and access token handling, followed by audit logging elements.


**Generating Comprehensive Schema**

I'm now drafting the database schema using the identified entities and their attributes. I'm focusing on defining tables like `Users`, `ExternalIdentities`, `Sessions`, `AuditLogs`, `PasswordResetTokens`, `EmailVerificationTokens`, and `TokenBlacklist`. The next step is to detail their relationships and begin defining SQL `CREATE TABLE` statements for each of them.


**Mapping Entity Relationships**

I'm now detailing relationships between entities. Users can have multiple sessions, audit logs, external identities, password reset tokens, and email verification tokens. The next step is to use these relationships to generate the SQL schema.


**Formulating Entity Relationships**

I've established the entity relationships, including one-to-many associations for users with sessions, audit logs, external identities, password reset, and email verification tokens. I've also clarified the connection between sessions and a token blacklist, considering the implications of JWT revocation and access token handling, which, based on specifications, implies a blacklist. Now I'll generate the SQL schema.


**Generating Core SQL Tables**

I'm translating the entity relationships into an initial SQL schema, focusing on fundamental table creation. I'm writing `CREATE TABLE` statements for `Users`, `ExternalIdentities`, `Sessions`, and `AuditLogs`, paying close attention to data types, primary keys, foreign key constraints, and relevant indexes. I'm also ensuring password hashing for security.


**Creating the Database Schema**

I'm now generating SQL `CREATE TABLE` statements for each entity, including `Users`, `ExternalIdentities`, `Sessions`, `AuditLogs`, `PasswordResetTokens`, `EmailVerificationTokens`, and `TokenBlacklist`. I'm focusing on defining appropriate data types, primary keys, foreign key constraints, and relevant indexes to optimize performance and data integrity. I'll include user-specific attributes from the specification.


**Formulating SQL Schema Generation**

I'm now ready to begin translating the documented entities and relationships into SQL `CREATE TABLE` statements. I will start generating SQL statements for each table, including Users, Sessions, ExternalIdentities, AuditLogs, PasswordResetTokens, EmailVerificationTokens, and JwtBlacklist. Primary keys, foreign keys, constraints, and data types will be meticulously defined.

### 1. Entities Discovered

*   **Users**: Core user profiles, authentication credentials, and account status.
*   **ExternalIdentities**: Links to external authentication providers (OAuth2, SAML).
*   **Sessions**: Manages active user sessions, primarily for refresh tokens.
*   **AuditLogs**: Records security-relevant events for compliance and monitoring.
*   **PasswordResetTokens**: Stores tokens used for password reset functionality.
*   **EmailVerificationTokens**: Stores tokens used for email address verification.
*   **JwtBlacklist**: Stores revoked JWT Access Token IDs to prevent their use.

### 2. ER Relationships

*   **Users** 1 — \* **ExternalIdentities**: A user can link multiple external identity providers (e.g., Google, GitHub, SAML).
*   **Users** 1 — \* **Sessions**: A user can have multiple active sessions, each identified by a unique refresh token.
*   **Users** 1 — \* **AuditLogs**: A user's actions generate multiple audit log entries. Audit log entries can also exist without a direct user association (e.g., failed login attempts for non-existent users).
*   **Users** 1 — \* **PasswordResetTokens**: A user can request multiple password reset tokens, though typically only the most recent valid one is used.
*   **Users** 1 — \* **EmailVerificationTokens**: A user can receive multiple email verification tokens, but only one is usually active and needed for verification.
*   **Sessions** 1 — 0..1 **JwtBlacklist**: While a JWT access token is derived from a session, the `JwtBlacklist` primarily stores the JWT's unique ID (JTI) and its expiration for independent revocation, rather than directly referencing a `Session` ID in a foreign key relationship.

### 3. SQL Schema

```sql
-- Table for core user information
CREATE TABLE Users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    mfa_secret_totp VARCHAR(255), -- Stores TOTP secret if enabled
    mfa_secret_sms VARCHAR(255), -- Stores SMS-based MFA secret/config if enabled
    mfa_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE, -- Timestamp until account is locked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Table for external identity providers (OAuth2, SAML)
CREATE TABLE ExternalIdentities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider_type VARCHAR(50) NOT NULL, -- e.g., 'GOOGLE', 'MICROSOFT', 'GITHUB', 'SAML'
    provider_id VARCHAR(255) NOT NULL, -- Unique ID from the external provider
    access_token TEXT, -- Optional: Store external access token if needed for API calls
    refresh_token TEXT, -- Optional: Store external refresh token
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (provider_type, provider_id),
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table for user sessions and refresh tokens
CREATE TABLE Sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Represents the refresh token ID
    user_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL, -- Hash of the refresh token
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address VARCHAR(45), -- Supports IPv4 and IPv6
    user_agent TEXT,
    is_valid BOOLEAN DEFAULT TRUE NOT NULL, -- For explicit revocation
    revoked_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table for audit logging
CREATE TABLE AuditLogs (
    id BIGSERIAL PRIMARY KEY, -- Use BIGSERIAL for potentially high volume logs
    user_id UUID, -- Nullable for events without a logged-in user (e.g., failed login)
    event_type VARCHAR(100) NOT NULL, -- e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_RESET', 'MFA_ENABLED', 'ACCOUNT_LOCKED', 'TOKEN_REVOKED', 'SUSPICIOUS_LOGIN'
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    details JSONB, -- For flexible storage of additional event details
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Table for password reset tokens
CREATE TABLE PasswordResetTokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- Hash of the reset token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table for email verification tokens
CREATE TABLE EmailVerificationTokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- Hash of the verification token
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Table for blacklisting JWT access tokens
CREATE TABLE JwtBlacklist (
    jti VARCHAR(255) PRIMARY KEY, -- JWT ID claim
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the token would naturally expire
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

### 4. Indexing Strategy

*   **Users**:
    *   `email`: Unique index for fast lookups during login and registration.
    *   `created_at`: For time-based user analytics.
*   **ExternalIdentities**:
    *   `user_id`: Foreign key index for efficient retrieval of a user's external accounts.
    *   `provider_type, provider_id`: Unique composite index for quick lookup of external identities.
*   **Sessions**:
    *   `refresh_token_hash`: Unique index for validating refresh tokens.
    *   `user_id`: Foreign key index for retrieving all sessions for a given user.
    *   `expires_at`: For efficiently clearing expired sessions.
    *   `is_valid`: Often used with `expires_at` for filtering active sessions.
*   **AuditLogs**:
    *   `user_id`: Foreign key index for retrieving a user's audit trail.
    *   `timestamp`: For time-series queries and ordering.
    *   `event_type`: For filtering specific types of events.
*   **PasswordResetTokens**:
    *   `token_hash`: Unique index for quick token validation.
    *   `user_id`: Foreign key index for retrieving user's tokens.
    *   `expires_at, is_used`: For cleaning up expired/used tokens.
*   **EmailVerificationTokens**:
    *   `token_hash`: Unique index for quick token validation.
    *   `user_id`: Foreign key index for retrieving user's tokens.
    *   `expires_at, is_used`: For cleaning up expired/used tokens.
*   **JwtBlacklist**:
    *   `jti`: Primary key, naturally indexed for fast blacklisting lookups.
    *   `expires_at`: For efficiently clearing expired blacklist entries.

### 5. Scaling Considerations

*   **Partitioning**:
    *   **AuditLogs**: This table will experience a high volume of writes. Implementing time-based partitioning (e.g., by month or quarter) can improve query performance for historical data and facilitate data retention policies.
    *   **Sessions**: Given the requirement for 50,000 concurrent sessions, this table can also grow rapidly. Range partitioning by `expires_at` or hash partitioning on `user_id` could be considered to distribute load and improve lookup times for specific users or to efficiently prune expired sessions.
*   **Sharding**:
    *   **Users**: As the user base grows, sharding the `Users` table (and its related tables like `ExternalIdentities`, `Sessions`, `PasswordResetTokens`, `EmailVerificationTokens` using `user_id` as the shard key) will be crucial. This distributes data and query load across multiple database instances, enabling horizontal scalability to support millions of users.
    *   **Stateless Tables**: `JwtBlacklist` could also be sharded, perhaps by `jti` hash, if the volume of revoked JWTs becomes extremely high.
*   **Caching**:
    *   **Token Introspection**: Given the API endpoint for token introspection, a distributed caching layer (e.g., Redis, Memcached) should be used to cache valid JWTs and their associated claims. This reduces database lookups for every authenticated request to dependent microservices, improving the NFR for <100ms authentication response time.
    *   **User Profiles**: Frequently accessed user data (e.g., `id`, `email`, `mfa_enabled`, `is_email_verified`) can be cached to reduce load on the `Users` table, especially for the `/auth/me` endpoint.
    *   **Rate Limiting/Brute Force**: In-memory caching or a dedicated distributed cache is essential for tracking IP request counts and failed login attempts in real-time, as database operations would be too slow for these high-frequency, real-time security checks. This aligns with the "Caching Mechanism" identified in the User Story Generation dependencies.
    *   **Revoked Tokens**: While `JwtBlacklist` stores revoked JTIs, caching these JTIs in a highly performant, distributed cache will allow for extremely fast checks during token validation, ensuring that revoked tokens are rejected immediately without hitting the database.