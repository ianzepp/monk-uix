# Monk UI - Specification Document

**Version:** 1.0  
**Date:** November 11, 2025  
**Purpose:** Read-optimized web interface for exploring and managing Monk API projects

---

## 1. Project Overview

### 1.1 Purpose
Monk UI is a web-based interface for the Monk API platform that prioritizes data exploration and observation over data entry. It serves as a "data observatory" where users can discover, review, and understand their project data, with most creation and modification happening through AI agents using the CLI or direct API calls.

### 1.2 Design Philosophy
- **Read-heavy, write-light:** Optimized for viewing and understanding data
- **AI-managed data:** Assumes most changes happen via AI agents and CLI
- **Discovery-focused:** Easy navigation, search, and drill-down capabilities
- **Classic Salesforce aesthetic:** Pre-Lightning UI patterns (tabs, tables, forms)
- **Simplicity:** Straightforward tech stack that's easy to understand and modify

### 1.3 Core User Flows
1. View all projects/tenants
2. Select a project and explore its schemas
3. View list of records for a schema
4. View details of a single record
5. View related records (foreign key relationships)
6. Quick inline edits for simple corrections
7. Delete records when needed

---

## 2. Architecture

### 2.1 Tech Stack
**Frontend:**
- React 18+ (stable, AI-friendly)
- React Router 6 for navigation
- Native Fetch API for HTTP calls (no axios)
- CSS Modules or plain CSS for styling
- TanStack Table for complex table views
- Vite as build tool

**Principles:**
- No bleeding-edge features
- Minimal build complexity
- Straightforward patterns (2018-era React best practices)
- Code that's easy for AIs to understand and modify

### 2.2 Project Structure
```
monk-ui/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   ├── Navigation.jsx
│   │   │   └── Breadcrumbs.jsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.jsx
│   │   │   └── ProjectList.jsx
│   │   ├── schemas/
│   │   │   ├── SchemaTab.jsx
│   │   │   └── SchemaList.jsx
│   │   ├── records/
│   │   │   ├── RecordTable.jsx
│   │   │   ├── RecordDetail.jsx
│   │   │   ├── RelatedList.jsx
│   │   │   └── InlineEdit.jsx
│   │   └── common/
│   │       ├── SearchBar.jsx
│   │       ├── Button.jsx
│   │       └── Modal.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── ProjectView.jsx
│   │   ├── RecordList.jsx
│   │   └── RecordDetail.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── storage.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   └── useLocalStorage.js
│   ├── utils/
│   │   ├── formatters.js
│   │   └── validators.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles/
│       ├── global.css
│       └── variables.css
├── public/
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

### 2.3 API Integration

**Base Configuration:**
```javascript
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:9001';
```

**Key Endpoints to Support:**

**Authentication:**
- `POST /api/auth/login` - Authenticate (tenant + user, no password)

**Admin/Tenant Management:**
- `GET /api/admin/tenants` - List all tenants/projects

**Schema Operations:**
- `GET /api/describe` - List all schemas for current tenant
- `GET /api/describe/{schema}` - Get schema definition
- `POST /api/describe/{schema}` - Create new schema
- `PUT /api/describe/{schema}` - Update schema
- `DELETE /api/describe/{schema}` - Delete schema (soft delete)

**Data Operations (Simple):**
- `GET /api/data/{schema}` - List all records (no filtering/sorting)
- `GET /api/data/{schema}/{id}` - Get single record
- `PUT /api/data/{schema}/{id}` - Update single record
- `DELETE /api/data/{schema}/{id}` - Delete single record

**Data Operations (Advanced):**
- `POST /api/find/{schema}` - Advanced filtering, sorting, pagination

**Response Format:**
All endpoints return responses wrapped in a standard format:
```javascript
{
  success: true,
  data: { /* actual data here */ }
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

**Authentication:**
- Session-based using JWT tokens
- Store token in localStorage
- Include `Authorization: Bearer {token}` header in all requests
- Remember last-used tenant/user

**API Service Pattern:**
```javascript
// services/api.js
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('monk_auth_token');
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers,
    },
  });
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error?.message || 'API request failed');
  }
  
  return result.data; // Unwrap the data property
};
```

---

## 3. UI Views and Components

### 3.1 Home Dashboard

**Purpose:** Overview of all projects/tenants

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Monk]                    [Search] [Ian @ Default ▼]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Your Projects                                           │
│                                                          │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  Exercise        │  │  Recipe Book     │            │
│  │  Tracker         │  │                  │            │
│  │                  │  │                  │            │
│  │  5 schemas       │  │  3 schemas       │            │
│  │  234 records     │  │  89 records      │            │
│  │  Active 2m ago   │  │  Active 3d ago   │            │
│  │                  │  │                  │            │
│  │  [Open Project]  │  │  [Open Project]  │            │
│  └──────────────────┘  └──────────────────┘            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- `ProjectCard` - Shows project name, stats, last activity
- `ProjectList` - Grid of project cards

**Data Required:**
- List of tenants (from `/api/admin/tenants`)
- For each tenant: count of schemas, count of records (aggregate)
- Last activity timestamp (if available, otherwise omit)

**User Actions:**
- Click project card → Navigate to Project View
- Global search (phase 2)

### 3.2 Project View

**Purpose:** Schema navigation and overview within a project

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Monk] Home > Exercise Tracker  [Search] [Ian ▼]      │
├─────────────────────────────────────────────────────────┤
│  Overview | Workouts | Exercises | Users | Schema       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Selected: Workouts]                                    │
│                                                          │
│  234 records                                             │
│  [Filter ▼] [Export via CLI]                            │
│                                                          │
│  ┌────┬─────────────┬──────────┬──────────┬─────────┐  │
│  │ ID │ Date        │ Type     │ Duration │ Actions │  │
│  ├────┼─────────────┼──────────┼──────────┼─────────┤  │
│  │ 1  │ 2025-11-11 │ Strength │ 45 min   │ [View]  │  │
│  │ 2  │ 2025-11-10 │ Cardio   │ 30 min   │ [View]  │  │
│  │ 3  │ 2025-11-09 │ Strength │ 50 min   │ [View]  │  │
│  └────┴─────────────┴──────────┴──────────┴─────────┘  │
│                                                          │
│  [Previous] Page 1 of 5 [Next]                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- `SchemaTab` - Tab navigation showing schema names
- `RecordTable` - Sortable, paginated table of records
- `Breadcrumbs` - Navigation trail

**Data Required:**
- List of schemas (from `/api/describe`)
- Records for selected schema:
  - **Initial load**: `GET /api/data/{schema}` (simple, all records)
  - **With filters/sorting**: `POST /api/find/{schema}` with query body
- Schema definition to determine columns (from `/api/describe/{schema}`)

**User Actions:**
- Switch between schema tabs
- Click record row → Navigate to Record Detail
- Sort columns (triggers Find API)
- Filter records (phase 2, triggers Find API)
- Pagination (triggers Find API with limit/offset)

**Display Logic:**
- Show ID column first
- Show next 4-6 most relevant fields (string, number, date types preferred)
- Hide internal fields (_created_at, _updated_at unless no other fields)
- Add "Actions" column with View/Delete buttons

**Implementation Note:**
Use simple `GET /api/data/{schema}` initially for performance. When user applies sorting or pagination, switch to `POST /api/find/{schema}` with appropriate query body.

### 3.3 Record Detail View

**Purpose:** Deep-dive into a single record with related data

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Monk] Home > Exercise Tracker > Workouts > #123      │
│  [Ian ▼]                                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Workout #123                                            │
│  [Edit] [Delete] [View JSON]                            │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  WORKOUT DETAILS                                 │   │
│  │                                                  │   │
│  │  Date: 2025-11-11                               │   │
│  │  Type: Strength                                 │   │
│  │  Duration: 45 minutes                           │   │
│  │  Notes: Focus on upper body compound movements  │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  RELATED: Exercises (3 records)                 │   │
│  │                                                  │   │
│  │  ┌────┬──────────────┬──────┬─────────────┐    │   │
│  │  │ ID │ Name         │ Sets │ Actions     │    │   │
│  │  ├────┼──────────────┼──────┼─────────────┤    │   │
│  │  │ 45 │ Bench Press  │ 4    │ [View]      │    │   │
│  │  │ 46 │ Pull-ups     │ 3    │ [View]      │    │   │
│  │  │ 47 │ Shoulder P.  │ 3    │ [View]      │    │   │
│  │  └────┴──────────────┴──────┴─────────────┘    │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Components:**
- `RecordDetail` - Form-like display of all fields
- `RelatedList` - Mini-table showing related records

**Data Required:**
- Single record data (from `/api/data/{schema}/{id}`)
- Schema definition (from `/api/describe/{schema}`)
- Related records:
  - Identify relationships from schema definition (fields with `relationship` property)
  - Fetch using Find API: `POST /api/find/{related_schema}` with `where: {parent_field: record_id}`
  - Limit to 5 records per related list
  - Sort by `created_at desc` or most relevant field

**User Actions:**
- Edit button → Enable inline editing (phase 2)
- Delete button → Confirm and delete record
- View JSON → Show raw JSON in modal
- Click related record → Navigate to that record's detail view
- "View All (N)" on related lists → Navigate to filtered list view of related schema

**Display Logic:**
- Group fields into logical sections if possible
- Display fields in a two-column layout for readability
- For foreign key fields, show the related record ID as a clickable link
- Related lists at bottom, one per relationship
- Each related list shows max 5 records with "View All (N)" if more exist

**Related List Query Example:**
```javascript
// For a workout with exercises relationship
POST /api/find/exercises
{
  "where": {"workout_id": "workout-123"},
  "order": ["created_at desc"],
  "limit": 5
}
```

### 3.4 Inline Editing (Phase 2)

**Purpose:** Quick corrections without full form design

**Behavior:**
- Click "Edit" button on record detail view
- Fields become editable (input, textarea, select based on type)
- "Save" and "Cancel" buttons appear
- On save: `PUT /api/data/{schema}/{id}` with updated record
- On success: Refresh view, show success message

**Field Type Mapping:**
```javascript
{
  "string": "text input",
  "number": "number input",
  "integer": "number input",
  "boolean": "checkbox",
  "date": "date input",
  "datetime": "datetime-local input",
  "enum": "select dropdown"
}
```

---

## 4. State Management

### 4.1 Authentication State
```javascript
{
  isAuthenticated: boolean,
  token: string,
  currentTenant: string,
  currentUser: string
}
```

**Storage:** localStorage
**Key:** `monk_auth`

### 4.2 Navigation State
```javascript
{
  currentProject: string,
  currentSchema: string,
  breadcrumbs: Array<{label, path}>
}
```

**Storage:** React Router state + React Context

### 4.3 Data Caching
**Strategy:** Fetch on demand, no complex caching initially
**Future:** Consider React Query or SWR for automatic refetching

---

## 5. Styling Guidelines

### 5.1 Pre-Lightning Salesforce Aesthetic

**Colors:**
```css
:root {
  --primary-blue: #0070d2;
  --dark-blue: #00396b;
  --light-blue: #e8f3f8;
  --gray-1: #f3f3f3;  /* backgrounds */
  --gray-2: #dddddd;  /* borders */
  --gray-3: #696969;  /* secondary text */
  --gray-4: #333333;  /* primary text */
  --success: #04844b;
  --warning: #ffb75d;
  --error: #c23934;
  --white: #ffffff;
}
```

**Typography:**
```css
body {
  font-family: "Salesforce Sans", -apple-system, BlinkMacSystemFont, 
               "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gray-4);
}

h1 { font-size: 18px; font-weight: 700; }
h2 { font-size: 16px; font-weight: 700; }
h3 { font-size: 14px; font-weight: 700; }
```

**Layout:**
- Dense, information-rich
- Minimal whitespace (compact)
- Clean borders and dividers
- Tab navigation with subtle shadows
- Tables with alternating row colors

**Components:**
- Buttons: Small, rounded corners, solid backgrounds
- Inputs: 1px border, focus state with blue border
- Tables: Bordered, striped rows, fixed header
- Cards: Subtle shadow, white background
- Modals: Centered, overlay with 50% opacity black background

### 5.2 Responsive Behavior
**Priority:** Desktop-first (this is a data exploration tool)
**Minimum width:** 1024px recommended
**Future:** Mobile views can be added but are not priority

---

## 6. Development Phases

### Phase 1: Core Views (MVP)
**Goal:** Get the basic exploration flow working

**Tasks:**
1. Project setup (Vite + React)
2. API service layer (`api.js`, `auth.js`)
3. Authentication flow (login, token storage)
4. Home dashboard (list projects)
5. Project view (schema tabs + record table)
6. Record detail view (single record display)
7. Basic styling (Salesforce aesthetic)

**Deliverable:** Can navigate from home → project → schema → record

### Phase 2: Enhancements
**Goal:** Make it actually useful

**Tasks:**
1. Inline editing (update records)
2. Delete functionality
3. Related lists (show foreign key relationships)
4. View JSON modal
5. Sorting and filtering on tables
6. Pagination
7. Error handling and loading states
8. Success/error notifications

**Deliverable:** Can explore, edit, and delete records comfortably

### Phase 3: Polish
**Goal:** Make it delightful

**Tasks:**
1. Global search
2. Recent activity tracking (if API supports it)
3. Keyboard shortcuts
4. Dark mode (optional)
5. Export reminders ("Use CLI for bulk exports")
6. Schema visualization
7. Performance optimizations

**Deliverable:** Production-ready personal tool

---

## 7. API Contract Details

### 7.1 Authentication

**POST /api/auth/login**
```json
// Request
{
  "tenant": "exercise-tracker",
  "user": "ian"
}

// Response (200 OK)
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tenant": "exercise-tracker",
  "user": "ian"
}
```

**Usage:**
- Store token in localStorage
- Include in all subsequent requests: `Authorization: Bearer {token}`

### 7.2 Tenant Management

**GET /api/admin/tenants**
```json
// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "exercise-tracker",
      "name": "Exercise Tracker",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": "recipe-book",
      "name": "Recipe Book",
      "created_at": "2025-02-01T14:30:00Z"
    }
  ]
}
```

### 7.3 Schema Discovery

**GET /api/describe**
```json
// Response (200 OK)
{
  "success": true,
  "data": [
    "workouts",
    "exercises",
    "users"
  ]
}
```

**GET /api/describe/{schema}**
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "name": "workouts",
    "title": "Workout Log",
    "description": "Track workout sessions",
    "type": "object",
    "properties": {
      "id": { "type": "string", "format": "uuid" },
      "date": { "type": "string", "format": "date" },
      "type": { "type": "string", "enum": ["Strength", "Cardio", "Flexibility"] },
      "duration": { "type": "integer" },
      "notes": { "type": "string" },
      "user_id": { 
        "type": "string",
        "relationship": {
          "schema": "users",
          "type": "belongs_to"
        }
      }
    },
    "required": ["date", "type"]
  }
}
```

**Note:** Relationships are indicated by a nested `relationship` object with `schema` and `type` properties.

### 7.4 Data Operations

**GET /api/data/{schema}**

Supports pagination and filtering via query parameters.

```bash
# Simple list (all records)
GET /api/data/workouts

# With pagination
GET /api/data/workouts?limit=50&offset=0

# With filtering (basic)
GET /api/data/workouts?where={"status":"active"}

# With filtering, sorting, and pagination
GET /api/data/workouts?where={"type":"Strength"}&order=["date desc"]&limit=50&offset=0
```

```json
// Response (200 OK) - Array of records wrapped in success/data structure
{
  "success": true,
  "data": [
    {
      "id": "workout-123",
      "date": "2025-11-11",
      "type": "Strength",
      "duration": 45,
      "notes": "Upper body focus",
      "user_id": "user-1"
    },
    {
      "id": "workout-124",
      "date": "2025-11-10",
      "type": "Cardio",
      "duration": 30,
      "notes": "Easy run",
      "user_id": "user-1"
    }
  ],
  "count": 2  // Number of records in this response
}
```

**Query Parameters:**
- `limit` - Number of records to return (default: 50 recommended)
- `offset` - Number of records to skip (default: 0)
- `where` - JSON object for filtering (URL encoded)
- `order` - Array of sort strings like `["date desc", "name asc"]` (URL encoded)

**GET /api/data/{schema}/{id}**
```json
// Response (200 OK) - Single record object wrapped in success/data structure
{
  "success": true,
  "data": {
    "id": "workout-123",
    "date": "2025-11-11",
    "type": "Strength",
    "duration": 45,
    "notes": "Upper body focus",
    "user_id": "user-1"
  }
}
```

**PUT /api/data/{schema}/{id}**
```json
// Request - Full record object with changes
{
  "id": "workout-123",
  "date": "2025-11-11",
  "type": "Strength",
  "duration": 50,  // Changed
  "notes": "Upper body focus - added extra set",  // Changed
  "user_id": "user-1"
}

// Response (200 OK) - Updated record
{
  "success": true,
  "data": {
    "id": "workout-123",
    "date": "2025-11-11",
    "type": "Strength",
    "duration": 50,
    "notes": "Upper body focus - added extra set",
    "user_id": "user-1"
  }
}
```

**DELETE /api/data/{schema}/{id}**
```json
// Response (200 OK)
{
  "success": true,
  "data": {
    "id": "workout-123",
    "deleted": true,
    "trashed_at": "2025-11-11T14:00:00.000Z"
  }
}
```

**Important Notes:**
- Data API supports basic filtering via `where` query parameter
- For complex filtering (nested logic, multiple operators), use Find API instead
- Soft-deleted records are excluded from list operations but accessible by ID
- Both Data API and Find API support pagination; use Data API for simple cases

### 7.5 Advanced Search/Filtering (Find API)

**POST /api/find/{schema}**

The Find API provides powerful filtering, sorting, and pagination through a POST endpoint with JSON body.

```json
// Request - Basic filtering with sorting and pagination
{
  "where": {
    "type": "Strength",
    "date": {
      "$gte": "2025-01-01"
    }
  },
  "order": ["date desc", "duration asc"],
  "limit": 20,
  "offset": 0
}

// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "workout-123",
      "date": "2025-11-11",
      "type": "Strength",
      "duration": 45,
      "notes": "Upper body focus"
    }
    // ... more records
  ],
  "count": 15  // Total matching records in this result
}
```

**Available Operators:**
- **Comparison**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`
- **Pattern**: `$like`, `$nlike`, `$regex`, `$nregex`
- **Array**: `$in`, `$nin`, `$any`, `$all`, `$nany`, `$nall`
- **Range**: `$between`
- **Existence**: `$exists`, `$null`
- **Logical**: `$and`, `$or`, `$not`, `$nand`, `$nor`
- **Text**: `$text`, `$search`

**Complex Query Example:**
```json
{
  "where": {
    "$and": [
      {"type": {"$in": ["Strength", "Cardio"]}},
      {"$or": [
        {"duration": {"$gte": 30}},
        {"notes": {"$like": "%intense%"}}
      ]}
    ]
  },
  "order": ["date desc"],
  "limit": 10
}
```

**Pagination:**
- `limit`: Number of records to return (default: no limit)
- `offset`: Number of records to skip (default: 0)
- Note: Offset pagination is basic; for large datasets consider using cursor-based pagination with `after` parameter

**Sorting:**
- `order`: Array of strings in format `"field direction"` (e.g., `["date desc", "name asc"]`)
- Direction: `asc` (ascending) or `desc` (descending)
- Default sort direction is ascending if not specified

---

## 8. Error Handling

### 8.1 API Errors
**Standard Error Response:**
```json
{
  "error": "Not Found",
  "message": "Record with id 'workout-999' does not exist",
  "status": 404
}
```

**Client Handling:**
- 401 Unauthorized → Clear auth, redirect to login
- 404 Not Found → Show "Record not found" message
- 500 Server Error → Show generic error, log to console
- Network errors → Show "Cannot connect to API" message

### 8.2 User Feedback
**Notifications:**
- Success: Green toast, 3 seconds, "Record updated successfully"
- Error: Red toast, 5 seconds, show error message
- Loading: Spinner or skeleton UI while fetching

---

## 9. Configuration

### 9.1 Environment Variables
```bash
# .env.local
VITE_API_BASE_URL=http://localhost:9001
VITE_APP_NAME=Monk UI
VITE_DEFAULT_TENANT=default
VITE_DEFAULT_USER=ian
```

### 9.2 Build Configuration
**vite.config.js:**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:9001',
        changeOrigin: true
      }
    }
  }
})
```

---

## 10. Testing Strategy

### 10.1 Manual Testing Checklist
**Phase 1:**
- [ ] Can view list of projects
- [ ] Can click into a project
- [ ] Can see schema tabs
- [ ] Can view record table
- [ ] Can click into a record
- [ ] Can navigate back via breadcrumbs
- [ ] Authentication persists on refresh

**Phase 2:**
- [ ] Can edit a record inline
- [ ] Can delete a record
- [ ] Can view related lists
- [ ] Can view raw JSON
- [ ] Can sort table columns
- [ ] Can filter records
- [ ] Error messages display correctly

### 10.2 Future Automated Testing
- Component tests with React Testing Library
- API integration tests with MSW (Mock Service Worker)
- E2E tests with Playwright (optional)

---

## 11. Deployment

### 11.1 Development
```bash
npm install
npm run dev
# Runs on http://localhost:3000
```

### 11.2 Production Build
```bash
npm run build
# Outputs to dist/
```

### 11.3 Hosting Options
- **Option 1:** Serve from same server as monk-api (static files)
- **Option 2:** Separate static hosting (Netlify, Vercel, etc.)
- **Option 3:** Docker container alongside monk-api

**Recommendation:** Start with Option 1 for simplicity

---

## 12. Future Enhancements

### 12.1 Activity Logging
**If monk-api adds audit trail:**
- Show "Recent Activity" on home dashboard
- Show "Audit Trail" on record detail
- Filter by user/agent to see what changed when

### 12.2 Schema Designer
**Visual schema management:**
- Create new schemas via UI
- Edit existing schemas
- Visualize relationships between schemas
- Generate sample data

### 12.3 Agent Integration
**When agents become users:**
- Show agent activity separately
- Agent user management UI
- API key generation for agents

### 12.4 Advanced Search
**Global search across:**
- All projects
- All schemas
- Full-text search in records
- Search history

---

## 13. Implementation Decisions

### ✅ Resolved from API Documentation:

1. **Pagination** ✅ - Both Data API and Find API support `limit` and `offset`
   - Data API: via query parameters `?limit=50&offset=0`
   - Find API: via POST body `{limit: 50, offset: 0}`
2. **Filtering** ✅ - Two approaches:
   - Simple: Data API with `?where={"field":"value"}` query parameter
   - Complex: Find API POST with full filter expressions
3. **Sorting** ✅ - Both APIs support via `order` parameter (array of strings)
4. **Relationships** ✅ - Foreign keys indicated by `relationship` object in schema definition
5. **Response Format** ✅ - All responses wrapped in `{success: true, data: ...}` structure

### 📋 Finalized Decisions:

**Record Counts:**
- Count endpoint not yet exposed in API (internal only)
- For now: Client-side counting or skip counts on project cards
- Future: Will be added to Find API response

**Pagination Defaults:**
- Default limit: **50 records per page**
- Use Data API for simple pagination
- Switch to Find API when filters/complex sorting needed

**Soft Delete:**
- **Ignore trashed records for initial implementation**
- List operations automatically exclude soft-deleted records
- Direct ID access still retrieves trashed records (for future recovery features)
- No "Trash" view in Phase 1

**Related Lists:**
- **Limit to 5 records** per related list on detail view
- Show "View All (N)" link if more exist
- Use Find API to fetch related records: `POST /api/find/{related_schema}` with `where: {parent_id: "..."}`

### 🎯 API Usage Strategy:

**For List Views:**
1. Initial load: `GET /api/data/{schema}?limit=50`
2. With simple filter: `GET /api/data/{schema}?where={...}&limit=50&offset=0`
3. With complex filters: `POST /api/find/{schema}` with full query body
4. Always include `limit=50` to prevent loading thousands of records

**For Related Lists:**
```javascript
// Fetch related records
POST /api/find/exercises
{
  "where": {"workout_id": "workout-123"},
  "limit": 5,
  "order": ["created_at desc"]
}
```

**For Project Stats (Phase 2+):**
- Wait for count endpoint to be added to Find API
- Alternative: Show "50+ records" by checking if result.data.length === limit

---

## 14. Success Criteria

**Phase 1 Complete When:**
- Can authenticate and view projects
- Can navigate through: home → project → schema → record
- Data displays correctly in tables and detail views
- Basic Salesforce aesthetic is recognizable
- No critical bugs

**Phase 2 Complete When:**
- Can edit records inline
- Can delete records safely
- Related lists show correctly
- Error handling works well
- Performance is acceptable for 1000+ records per schema

**Project Success:**
- You (Ian) use it regularly for project exploration
- AI agents can make changes via CLI while you observe via UI
- Reduces cognitive load of "what's in my database?"

---

## Appendix A: Sample Data Structure

**Example Project: Exercise Tracker**

**Schemas:**
- `users`
- `workouts`
- `exercises`
- `goals`

**Sample Relationships:**
- `workouts.user_id` → `users.id`
- `exercises.workout_id` → `workouts.id`
- `goals.user_id` → `users.id`

**Sample Workout Record:**
```json
{
  "id": "workout-123",
  "date": "2025-11-11",
  "type": "Strength",
  "duration": 45,
  "notes": "Upper body compound movements",
  "user_id": "user-1",
  "created_at": "2025-11-11T10:23:00Z",
  "updated_at": "2025-11-11T10:25:00Z"
}
```

**Sample Exercise Records (related to workout-123):**
```json
[
  {
    "id": "exercise-45",
    "workout_id": "workout-123",
    "name": "Bench Press",
    "sets": 4,
    "reps": 8,
    "weight": 185
  },
  {
    "id": "exercise-46",
    "workout_id": "workout-123",
    "name": "Pull-ups",
    "sets": 3,
    "reps": 10,
    "weight": 0
  }
]
```

---

## Appendix B: Quick Start Commands

```bash
# Create new project
npm create vite@latest monk-ui -- --template react
cd monk-ui

# Install dependencies
npm install react-router-dom
npm install @tanstack/react-table

# Start development
npm run dev

# Build for production
npm run build
```

---

**End of Specification Document**
