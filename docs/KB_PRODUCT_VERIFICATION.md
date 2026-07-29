# Product Verification Pipeline

## Rule

**Never** flip `NEEDS_REVIEW` → `VERIFIED` without checks.

## Checklist (all must pass for VERIFIED)

1. Official registry record exists  
2. Registration number present  
3. Manufacturer matches (if provided)  
4. Active ingredient matches  
5. Formulation matches (if provided)  
6. Approved crops present  
7. Approved targets present  
8. Label URL or official PDF present  
9. Registration not expired  
10. Source checksum stored  

## Result statuses

| Status | Meaning |
|--------|---------|
| VERIFIED | All checks passed; `labelVerified=true`; `registrationStatus=ACTIVE` |
| NEEDS_REVIEW | Incomplete evidence |
| CONFLICT | Contradictory fields across sources |
| EXPIRED | Past expiry date |
| REVOKED | Explicitly revoked in registry |

## Chat recommendation gate

Show product only if:

```
status === VERIFIED
AND registrationStatus === ACTIVE
AND labelVerified === true
AND crop match
AND target match (when known)
AND region/country allowed
```

Otherwise omit product; if chemical class discussed, say:

> Dozani mahsulotning rasmiy yorlig‘i va mahalliy agronom ko‘rsatmasi bo‘yicha aniqlang.

## Implementation

- `server/kb/products/verify.ts` — pure verification function  
- `npm run kb:verify-products` — batch over DB/corpus product chunks  
- Admin: approve with `force` only logs audit; still requires checklist for registry products  
