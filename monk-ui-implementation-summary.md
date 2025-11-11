# Monk UI - Implementation Summary

**Date:** November 11, 2025  
**Spec Version:** 1.0 (Updated)

---

## Quick Reference

### API Endpoints

**Authentication:**
```bash
POST /api/auth/login
Body: {tenant: "project-name", user: "ian"}
Response: {success: true, data: {token: "...", tenant: "...", user: "..."}}
```

**Projects/Tenants:**
```bash
GET /api/admin/tenants
Response: {success: true, data: [{id, name, created_at}, ...]}
```

**Schemas:**
```bash
GET /api/describe
Response: {success: true, data: ["schema1", "schema2", ...]}

GET /api/describe/{schema}
Response: {success: true, data: {name, title, properties, required, ...}}
```

**Data (Simple):**
```bash
GET /api/data/{schema}?limit=50&offset=0
Response: {success: true, data: [{record1}, {record2}, ...], count: 2}

GET /api/data/{schema}/{id}
Response: {success: true, data: {id, field1, field2, ...}}

PUT /api/data/{schema}/{id}
Body: {id, field1, field2, ...}
Response: {success: true, data: {updated record}}

DELETE /api/data/{schema}/{id}
Response: {success: true, data: {id, deleted: true, trashed_at: "..."}}
```

**Data (Complex Filtering):**
```bash
POST /api/find/{schema}
Body: {
  where: {field: "value", other: {$gte: 10}},
  order: ["date desc", "name asc"],
  limit: 50,
  offset: 0
}
Response: {success: true, data: [...], count: 15}
```

---

## Key Implementation Decisions

### 1. Pagination Strategy
- **Default limit:** 50 records per page
- **Data API:** Use for simple pagination via query params `?limit=50&offset=0`
- **Find API:** Use for filtered/sorted pagination via POST body

### 2. API Usage Pattern
```
Simple list → GET /api/data/{schema}?limit=50
  ↓ User adds filter
Complex query → POST /api/find/{schema} with {where, order, limit}
```

### 3. Related Lists
- Limit to **5 records** per related list
- Show "View All (N)" link if more exist
- Fetch using Find API:
  ```javascript
  POST /api/find/{related_schema}
  {
    "where": {"parent_id_field": "parent-record-id"},
    "order": ["created_at desc"],
    "limit": 5
  }
  ```

### 4. Response Structure
All responses wrapped in:
```javascript
{
  success: true,
  data: /* actual data here */
}
```

Error responses:
```javascript
{
  success: false,
  error: {
    type: "ErrorType",
    message: "Human readable message",
    code: "ERROR_CODE"
  }
}
```

**Important:** Always unwrap the `.data` property when handling responses!

### 5. Soft Delete Handling
- Phase 1: **Ignore soft-deleted records** (automatic in list operations)
- List endpoints automatically exclude `trashed_at IS NOT NULL`
- Direct ID access can still retrieve trashed records
- No "Trash" view in initial implementation

### 6. Record Counts
- Count endpoint not yet exposed in API (internal only)
- For project cards: Skip exact counts or show "50+" if `result.data.length === limit`
- Future: Will be added to Find API

### 7. Relationship Detection
From schema definition:
```json
{
  "properties": {
    "user_id": {
      "type": "string",
      "relationship": {
        "schema": "users",
        "type": "belongs_to"
      }
    }
  }
}
```

**How to use:**
1. Get schema definition: `GET /api/describe/{schema}`
2. Find fields with `relationship` property
3. For related list, reverse the relationship:
   - If `workouts.user_id` → `users`, then `users/{id}` has related `workouts`
   - Fetch: `POST /api/find/workouts` with `where: {user_id: "{user-id}"}`

---

## Component Data Flow

### Home Dashboard
```
Load Projects
  ↓
GET /api/admin/tenants
  ↓
Display project cards
  ↓
Click project → Navigate to Project View
```

### Project View (Schema List)
```
Load Schemas for Project
  ↓
GET /api/describe
  ↓
Display tabs for each schema
  ↓
Select schema tab
  ↓
GET /api/data/{schema}?limit=50
  ↓
Display record table
  ↓
Click record → Navigate to Detail View
```

### Record Detail View
```
Load Record
  ↓
GET /api/data/{schema}/{id}
  ↓
GET /api/describe/{schema} (for field definitions)
  ↓
Display record fields
  ↓
Find relationships in schema
  ↓
For each relationship:
  POST /api/find/{related_schema}
  with where: {foreign_key: record_id}
  limit: 5
  ↓
Display related lists
```

### With Filters/Sorting (Phase 2)
```
User applies filter or sort
  ↓
POST /api/find/{schema}
{
  where: {status: "active", age: {$gte: 18}},
  order: ["date desc"],
  limit: 50,
  offset: 0
}
  ↓
Display filtered results
```

---

## Find API Operators Reference

### Comparison
- `$eq` - Equals
- `$ne` - Not equals
- `$gt` - Greater than
- `$gte` - Greater than or equal
- `$lt` - Less than
- `$lte` - Less than or equal

### Pattern Matching
- `$like` - SQL LIKE pattern (e.g., `"John%"`)
- `$nlike` - NOT LIKE
- `$regex` - Regular expression
- `$nregex` - NOT regex

### Arrays
- `$in` - Value in array (e.g., `{status: {$in: ["active", "pending"]}}`)
- `$nin` - Value not in array
- `$any` - Array overlap (PostgreSQL `&&`)
- `$all` - Array contains all (PostgreSQL `@>`)

### Range
- `$between` - Between two values (e.g., `{age: {$between: [18, 65]}}`)

### Existence
- `$exists` - Field exists (e.g., `{profile: {$exists: true}}`)
- `$null` - Field is null

### Logical
- `$and` - AND condition (default for multiple fields)
- `$or` - OR condition
- `$not` - NOT condition
- `$nand` - Negated AND
- `$nor` - Negated OR

### Examples
```json
{
  "where": {
    "$and": [
      {"status": "active"},
      {"$or": [
        {"age": {"$gte": 18}},
        {"verified": true}
      ]},
      {"role": {"$in": ["admin", "moderator"]}}
    ]
  },
  "order": ["created_at desc"],
  "limit": 50
}
```

---

## Phase 1 Checklist

### Must Have (MVP)
- [x] Spec complete
- [ ] Project setup (Vite + React)
- [ ] API service layer with auth
- [ ] Home dashboard (list projects)
- [ ] Project view (schema tabs + record table)
- [ ] Record detail view
- [ ] Basic navigation (breadcrumbs, back buttons)
- [ ] Error handling (401, 404, 500)
- [ ] Loading states
- [ ] Basic Salesforce aesthetic

### Nice to Have (Phase 1.5)
- [ ] Pagination controls
- [ ] Simple column sorting (triggers Find API)
- [ ] Delete confirmation modal
- [ ] Success/error toast notifications
- [ ] Related lists (limit 5)

### Defer to Phase 2
- [ ] Inline editing
- [ ] Advanced filtering UI
- [ ] Search functionality
- [ ] View JSON modal
- [ ] Schema management
- [ ] Project statistics

---

## Testing Strategy

### Manual Testing Focus
1. **Authentication flow**
   - Login with tenant/user
   - Token persists on refresh
   - 401 redirects to login

2. **Navigation flow**
   - Home → Project → Schema → Record
   - Breadcrumbs work
   - Back button works

3. **Data display**
   - Projects load correctly
   - Schema tabs appear
   - Records display in table
   - Detail view shows all fields

4. **Error handling**
   - Network errors show message
   - 404 shows "not found"
   - Invalid tokens redirect

### API Integration Testing
Use actual monk-api instance:
```bash
# Start monk-api
cd monk-api
npm start

# In another terminal, start monk-ui
cd monk-ui
npm run dev

# Test with real data
1. Login as ian@exercise-tracker
2. View workouts schema
3. Click a workout record
4. Verify related exercises appear
```

---

## Common Pitfalls to Avoid

### 1. Forgetting to Unwrap Response
```javascript
// ❌ Wrong
const projects = await fetch('/api/admin/tenants').then(r => r.json());
console.log(projects[0]); // undefined!

// ✅ Correct
const response = await fetch('/api/admin/tenants').then(r => r.json());
const projects = response.data;
console.log(projects[0]); // works!
```

### 2. Not Handling Auth Token
```javascript
// ❌ Wrong - No auth header
fetch('/api/data/users')

// ✅ Correct - Include token
fetch('/api/data/users', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('monk_auth_token')}`
  }
})
```

### 3. Loading Too Many Records
```javascript
// ❌ Wrong - Could load 10,000 records
fetch('/api/data/users')

// ✅ Correct - Limit results
fetch('/api/data/users?limit=50')
```

### 4. Wrong Related List Query
```javascript
// ❌ Wrong - Using GET
fetch(`/api/data/exercises?where={"workout_id":"${id}"}`)

// ✅ Correct - Using Find API POST
fetch('/api/find/exercises', {
  method: 'POST',
  body: JSON.stringify({
    where: {workout_id: id},
    limit: 5
  })
})
```

### 5. Not Checking Relationship Direction
```javascript
// Schema shows: workouts.user_id → users
// This means:
// - A workout belongs_to a user
// - A user has_many workouts

// To show user's workouts (related list):
// Find workouts WHERE user_id = {user-id}
POST /api/find/workouts
{where: {user_id: "user-123"}}

// NOT the other way around!
```

---

## Next Steps

1. **Review this spec with Claude Code**
2. **Create new project:** `npm create vite@latest monk-ui -- --template react`
3. **Install dependencies:**
   ```bash
   npm install react-router-dom @tanstack/react-table
   ```
4. **Start with Phase 1 MVP:**
   - API service layer first
   - Then authentication
   - Then home dashboard
   - Then project view
   - Then record detail

5. **Test incrementally** with actual monk-api instance

---

## Support

For questions about monk-api:
- Repo: https://github.com/ianzepp/monk-api
- Docs: `/docs/` folder in repo
- API Reference:
  - 31-meta-api.md (schemas)
  - 32-data-api.md (CRUD)
  - 33-find-api.md (filtering)

---

**Good luck building!** 🚀
