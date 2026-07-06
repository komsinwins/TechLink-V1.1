# Security Specification

## Data Invariants
1. Customers must have a valid company name.
2. Onsite jobs must have a job number and a customer company name.
3. On-call jobs must have a customer company name.
4. Claims must have a customer company name.
5. All IDs must be alpha-numeric.

## The "Dirty Dozen" Payloads (Unauthenticated Public Database)
Since this application is designed as an internal shared business tool without user registration/authentication, it operates in public client-direct storage access mode. In this mode, we enforce:
1. Valid schema structures for all documents.
2. Proper types on written fields.
3. Length/boundary limits where possible.

### Malicious Payload Examples
1. Attempt to write to `customers` without `companyName`.
2. Attempt to write a giant string into `jobNo` (exceeding 100 characters).
3. Attempt to write `status` on an onsiteJob with an invalid status option (e.g. `Delivered`).
4. Attempt to write to `settings` with serviceTypes not as an array of strings.

## The Test Runner
The security rules are deployed directly to the target project and tested via application flows.
