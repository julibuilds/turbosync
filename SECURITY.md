# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.0.1   | :white_check_mark: |

## Security Features

TurboSync has been built with security as a core principle. The following security measures are implemented:

### 1. Command Injection Prevention

**Protection Against:**
- Shell command injection via repository URLs
- Path manipulation in git commands
- Malicious branch names
- Commit message injection

**Implementation:**
- All shell commands use parameterized execution via `execa`
- Branch names validated against git naming rules
- Commit messages sanitized to remove control characters
- Repository URLs restricted to HTTPS only

### 2. Path Traversal Protection

**Protection Against:**
- Directory traversal attacks (`../../../etc/passwd`)
- Absolute path injection
- Symlink attacks
- Access to hidden/protected directories

**Implementation:**
- Comprehensive path validation before all filesystem operations
- Rejection of absolute paths and path traversal sequences
- Blocked access to hidden directories (`.git`, `.env`, etc.)
- Validation that all paths remain within workspace

### 3. Input Validation & Sanitization

**Protection Against:**
- Prototype pollution via JSON.parse
- Invalid configuration data
- Malformed user inputs
- DoS via extremely long inputs

**Implementation:**
- Zod schemas for all configuration validation
- Input length limits on all user-provided data
- Schema validation prevents prototype pollution
- Type safety throughout the codebase

### 4. Git URL Security

**Protection Against:**
- Malicious git protocols (`ext::`, `git://`)
- SSH URL injection
- Man-in-the-middle attacks via unencrypted protocols
- Credential theft

**Implementation:**
- Only HTTPS URLs allowed
- URL validation using URL parser
- Hostname validation
- Rejection of dangerous protocols

### 5. Race Condition Prevention

**Protection Against:**
- TOCTOU (Time-of-check-time-of-use) vulnerabilities
- File corruption during concurrent operations
- Symlink race conditions

**Implementation:**
- Atomic file operations for all writes
- Async filesystem operations instead of sync
- Atomic rename pattern for config updates
- Path validation before operations

### 6. Information Disclosure Prevention

**Protection Against:**
- Stack trace leakage
- Internal path disclosure
- System information exposure

**Implementation:**
- Sanitized error messages
- Debug mode for detailed errors (not enabled by default)
- Structured logging without sensitive data

### 7. Denial of Service Prevention

**Protection Against:**
- Hung operations on unresponsive repositories
- Infinite loops in git operations
- Memory exhaustion via large inputs

**Implementation:**
- Timeouts on all git operations (60s for operations, 10s for checks)
- Input length validation
- Resource cleanup in error cases

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [MAINTAINER_EMAIL]

You should receive a response within 48 hours. If for some reason you do not, please follow up to ensure we received your original message.

Please include the following information:

1. **Type of vulnerability** (e.g., command injection, path traversal, XSS)
2. **Full path of the source file(s)** related to the vulnerability
3. **Location** (line number) of the affected code
4. **Any special configuration** required to reproduce the issue
5. **Step-by-step instructions** to reproduce the issue
6. **Proof of concept** or exploit code (if possible)
7. **Impact** of the issue, including how an attacker might exploit it

### What to Expect

- **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours
- **Assessment**: We will assess the vulnerability and determine severity within 5 business days
- **Updates**: We will provide regular updates (at least weekly) on the progress of fixing the issue
- **Fix Timeline**: Critical vulnerabilities will be fixed within 7 days, high severity within 14 days
- **Disclosure**: We follow coordinated disclosure - we'll work with you on disclosure timeline
- **Credit**: We will credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices for Users

### 1. Keep TurboSync Updated

Always use the latest version of TurboSync to benefit from security patches.

```bash
bun update turbosync
```

### 2. Validate Repository Sources

Only integrate repositories from trusted sources. Review the repository before adding it to your workspace.

```bash
# Good - well-known, trusted repository
turbosync add facebook/react

# Risky - unknown or suspicious repository
# Verify the repository contents first!
turbosync add unknown-user/suspicious-repo
```

### 3. Use Branch Pinning

Pin to specific branches or tags for reproducibility:

```bash
turbosync add facebook/react -b v18.2.0
```

### 4. Review Configuration

Regularly review your `.turbosync.json` file for unexpected changes:

```bash
git diff .turbosync.json
```

### 5. Use Version Control

Always commit `.turbosync.json` to version control to track changes:

```bash
git add .turbosync.json
git commit -m "Update TurboSync configuration"
```

### 6. Enable Git Signing (Recommended)

For additional security, enable GPG signing for commits:

```bash
git config --global commit.gpgsign true
```

### 7. Audit External Code

Review the code from external repositories before integrating:

```bash
# Add with dry-run first
turbosync add facebook/react --dry-run

# Review the code before integrating
cd external/react
git log
git diff
```

## Known Security Limitations

### 1. Trust in External Repositories

TurboSync integrates code from external repositories. The security of your project depends on the trustworthiness of these external sources. Always:

- Verify the source repository is legitimate
- Review the code before integration
- Keep external dependencies updated
- Monitor for security advisories

### 2. Git Subtree Limitations

Git subtrees are permanent history imports. Malicious commits in the external repository will be imported into your repository. Consider:

- Reviewing git history before integration
- Using specific commits or tags rather than branches
- Regularly auditing external repository updates

### 3. Workspace Access

TurboSync requires write access to your workspace. Ensure:

- Run TurboSync only in trusted environments
- Review changes before committing
- Use version control to track all modifications

## Security Audit History

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2025-01-19 | Internal | Full Codebase | 3 Critical, 4 High, 11 Medium, 7 Low | Fixed |

### Critical Issues Fixed (v0.0.1)

1. **Command Injection in removeSubtree** - Fixed with path validation and input sanitization
2. **Path Traversal Vulnerability** - Fixed with comprehensive path validation
3. **Git URL Injection** - Fixed with HTTPS-only restriction and URL validation

### High Severity Issues Fixed (v0.0.1)

1. **Race Conditions in File Operations** - Fixed with atomic operations
2. **Synchronous File Operations** - Replaced with async operations
3. **Missing Input Sanitization** - Added branch name validation
4. **JSON Parsing Without Validation** - Added Zod schema validation

## Security Principles

TurboSync follows these security principles:

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions required
3. **Secure by Default**: Secure configuration out of the box
4. **Input Validation**: All inputs validated and sanitized
5. **Fail Secure**: Errors fail safely without exposing data
6. **Transparency**: Clear documentation of security features

## Security Roadmap

Planned security enhancements:

- [ ] Automated dependency vulnerability scanning
- [ ] Integration with security scanning tools (Snyk, Dependabot)
- [ ] Code signing for releases
- [ ] SBOM (Software Bill of Materials) generation
- [ ] Enhanced audit logging
- [ ] Security policy enforcement via CLI flags

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE - Common Weakness Enumeration](https://cwe.mitre.org/)
- [Git Security Best Practices](https://git-scm.com/docs/gitcredentials)

## Acknowledgments

We thank the following security researchers for responsibly disclosing vulnerabilities:

- [None yet]

---

**Last Updated**: 2025-01-19
