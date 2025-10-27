# Automatic RBAC Model Generation from OpenAPI Specifications

## Overview

This document outlines a system for automatically generating AuthHub RBAC models by analyzing OpenAPI (Swagger) specifications. The solution leverages Model Context Protocol (MCP) servers to expose AuthHub's RBAC management capabilities, allowing AI agents with tool-calling abilities to consume OpenAPI specs and intelligently create corresponding RBAC models.

---

## Problem Statement

**Challenge**: Manually creating RBAC models for external services is time-consuming and error-prone. Each service has unique resources, operations, and permission requirements that must be translated into roles and permissions.

**Goal**: Automate RBAC model creation by:
1. Analyzing a service's OpenAPI specification
2. Extracting resources, operations, and security requirements
3. Intelligently mapping these to RBAC roles and permissions
4. Creating the model in AuthHub via API

---

## Solution Architecture

### High-Level Flow

```
┌─────────────────┐
│  OpenAPI Spec   │
│  (Service API)  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   AI Agent (LLM)            │
│   - Analyzes OpenAPI spec   │
│   - Identifies resources    │
│   - Determines operations   │
│   - Maps to RBAC patterns   │
└────────┬────────────────────┘
         │
         │ Uses MCP Tools
         ▼
┌─────────────────────────────┐
│   AuthHub MCP Server        │
│   - createRbacModel()       │
│   - createRole()            │
│   - createPermission()      │
│   - assignPermissions()     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   AuthHub Database          │
│   - RBAC Models             │
│   - Roles                   │
│   - Permissions             │
│   - Role-Permission Maps    │
└─────────────────────────────┘
```

---

## Component 1: AuthHub MCP Server

### What is MCP?

**Model Context Protocol (MCP)** is a standardized protocol that allows AI models to interact with external tools and services. An MCP server exposes specific functionality as "tools" that AI agents can discover and invoke.

### AuthHub MCP Server Capabilities

The AuthHub MCP server would expose the following tools:

#### 1. **RBAC Model Management**

```typescript
// Tool: createRbacModel
{
  name: "authhub_create_rbac_model",
  description: "Create a new RBAC model in AuthHub",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the RBAC model" },
      description: { type: "string", description: "Description of the model" }
    },
    required: ["name"]
  }
}
```

#### 2. **Role Management**

```typescript
// Tool: createRole
{
  name: "authhub_create_role",
  description: "Create a role within an RBAC model",
  inputSchema: {
    type: "object",
    properties: {
      rbacModelId: { type: "string", description: "UUID of the RBAC model" },
      name: { type: "string", description: "Role name (e.g., 'Admin', 'Editor')" },
      description: { type: "string", description: "Role description" }
    },
    required: ["rbacModelId", "name"]
  }
}
```

#### 3. **Permission Management**

```typescript
// Tool: createPermission
{
  name: "authhub_create_permission",
  description: "Create a permission within an RBAC model",
  inputSchema: {
    type: "object",
    properties: {
      rbacModelId: { type: "string" },
      name: { type: "string", description: "Permission in resource:action format" },
      description: { type: "string" }
    },
    required: ["rbacModelId", "name"]
  }
}
```

#### 4. **Role-Permission Assignment**

```typescript
// Tool: assignPermissionsToRole
{
  name: "authhub_assign_permissions",
  description: "Assign permissions to a role",
  inputSchema: {
    type: "object",
    properties: {
      roleId: { type: "string" },
      permissionIds: { 
        type: "array", 
        items: { type: "string" },
        description: "Array of permission UUIDs"
      }
    },
    required: ["roleId", "permissionIds"]
  }
}
```

#### 5. **Query Tools**

```typescript
// Tool: getRbacModel
{
  name: "authhub_get_rbac_model",
  description: "Retrieve RBAC model details including roles and permissions",
  inputSchema: {
    type: "object",
    properties: {
      modelId: { type: "string" }
    },
    required: ["modelId"]
  }
}

// Tool: listRbacModels
{
  name: "authhub_list_rbac_models",
  description: "List all RBAC models in AuthHub",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

### MCP Server Implementation Location

```
server/
  mcp/
    authhub-server.ts        # Main MCP server implementation
    tools/
      rbac-tools.ts          # RBAC management tools
      service-tools.ts       # Service management tools
    index.ts                 # Server entry point
```

### Authentication for MCP Server

The MCP server would require authentication via:
- **API Keys**: Admin-generated API keys for external access
- **JWT Tokens**: Session-based authentication for internal tools
- **Service Secrets**: Service-to-service authentication

---

## Component 2: OpenAPI Specification Analysis

### What the AI Agent Analyzes

#### 1. **API Endpoints → Resources**

Extract resources from endpoint paths:

```yaml
# OpenAPI Spec
paths:
  /api/posts:
    get: ...
    post: ...
  /api/posts/{id}:
    get: ...
    put: ...
    delete: ...
  /api/comments:
    get: ...
    post: ...
```

**Extracted Resources**: `posts`, `comments`

#### 2. **HTTP Methods → Actions**

Map HTTP methods to RBAC actions:

| HTTP Method | RBAC Action |
|-------------|-------------|
| GET         | `view` or `read` |
| POST        | `create` |
| PUT/PATCH   | `edit` or `update` |
| DELETE      | `delete` |

**Generated Permissions**:
- `post:view`
- `post:create`
- `post:edit`
- `post:delete`
- `comment:view`
- `comment:create`

#### 3. **Security Schemes → Role Hints**

Analyze security requirements:

```yaml
# OpenAPI Spec
security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: "JWT token with role-based permissions"
```

#### 4. **Tags & Descriptions → Role Groupings**

Use endpoint tags to infer roles:

```yaml
paths:
  /api/admin/users:
    get:
      tags: ["admin"]
      summary: "List all users (admin only)"
  /api/posts:
    get:
      tags: ["content"]
      summary: "View posts (public)"
```

**Inferred Roles**:
- **Admin** - Full access to admin endpoints
- **Content Manager** - Manage posts and content
- **Viewer** - Read-only access to public endpoints

#### 5. **Operation Descriptions → Permission Context**

Extract semantic meaning from descriptions:

```yaml
paths:
  /api/posts/{id}/publish:
    post:
      summary: "Publish a post (editors and admins only)"
      description: "Makes a draft post publicly visible"
```

**Generated Permission**: `post:publish` (restricted to Editor/Admin roles)

---

## Component 3: AI Agent Workflow

### Step-by-Step Process

#### Step 1: Receive OpenAPI Spec URL

```
User Input: "Generate RBAC model for https://api.example.com/openapi.json"
```

#### Step 2: Fetch and Parse OpenAPI Spec

```typescript
// AI agent fetches the spec
const spec = await fetch(openapiUrl).then(r => r.json());

// Parse key components
const paths = spec.paths;
const securitySchemes = spec.components?.securitySchemes;
const tags = spec.tags || [];
```

#### Step 3: Extract Resources

```typescript
// AI identifies unique resources
const resources = new Set();
for (const path of Object.keys(paths)) {
  // Extract resource from path: /api/{resource}/{id}
  const match = path.match(/\/api\/([^\/]+)/);
  if (match) resources.add(match[1]);
}

// Result: ["users", "posts", "comments", "settings"]
```

#### Step 4: Map Operations to Permissions

```typescript
const permissions = [];
for (const [path, methods] of Object.entries(paths)) {
  const resource = extractResource(path);
  
  for (const [method, operation] of Object.entries(methods)) {
    const action = mapHttpMethodToAction(method); // GET -> view
    permissions.push({
      name: `${resource}:${action}`,
      description: operation.summary || operation.description
    });
  }
}
```

#### Step 5: Infer Role Hierarchy

```typescript
// AI analyzes tags, descriptions, security requirements
const roles = [
  {
    name: "Admin",
    description: "Full system access",
    keywords: ["admin", "administrator", "system"]
  },
  {
    name: "Editor",
    description: "Content management",
    keywords: ["editor", "content", "manage"]
  },
  {
    name: "Viewer",
    description: "Read-only access",
    keywords: ["view", "read", "public"]
  }
];
```

#### Step 6: Create RBAC Model via MCP

```typescript
// AI agent calls MCP tools
const model = await mcpClient.call("authhub_create_rbac_model", {
  name: "Example API RBAC",
  description: "Auto-generated from OpenAPI spec"
});

// Create roles
for (const roleData of roles) {
  const role = await mcpClient.call("authhub_create_role", {
    rbacModelId: model.id,
    name: roleData.name,
    description: roleData.description
  });
  
  // Create and assign permissions
  const rolePermissions = determineRolePermissions(roleData, permissions);
  for (const perm of rolePermissions) {
    const permission = await mcpClient.call("authhub_create_permission", {
      rbacModelId: model.id,
      name: perm.name,
      description: perm.description
    });
    
    await mcpClient.call("authhub_assign_permissions", {
      roleId: role.id,
      permissionIds: [permission.id]
    });
  }
}
```

---

## Example: Real-World OpenAPI → RBAC Mapping

### Input: Blog API OpenAPI Spec

```yaml
openapi: 3.0.0
info:
  title: Blog API
  version: 1.0.0

paths:
  /api/posts:
    get:
      summary: List all posts
      tags: [content]
    post:
      summary: Create a new post (editors only)
      tags: [content]
      security:
        - bearerAuth: []
  
  /api/posts/{id}:
    get:
      summary: View post details
      tags: [content]
    put:
      summary: Update post (editors only)
      tags: [content]
      security:
        - bearerAuth: []
    delete:
      summary: Delete post (admins only)
      tags: [admin]
      security:
        - bearerAuth: []
  
  /api/posts/{id}/publish:
    post:
      summary: Publish post (editors and admins)
      tags: [content]
      security:
        - bearerAuth: []
  
  /api/users:
    get:
      summary: List users (admins only)
      tags: [admin]
      security:
        - bearerAuth: []
    post:
      summary: Create user (admins only)
      tags: [admin]
      security:
        - bearerAuth: []
  
  /api/comments:
    get:
      summary: View comments
      tags: [content]
    post:
      summary: Create comment
      tags: [content]
      security:
        - bearerAuth: []
```

### Output: Generated RBAC Model

**Model Name**: "Blog API RBAC"

**Roles**:
1. **Admin**
   - Full access to all resources
   - User management capabilities
   
2. **Editor**
   - Content creation and management
   - Cannot manage users or delete posts
   
3. **Author**
   - Create own posts and comments
   - Cannot publish or delete
   
4. **Viewer**
   - Read-only access to public content

**Permissions**:
- `post:view` - View posts
- `post:create` - Create new posts
- `post:edit` - Edit existing posts
- `post:delete` - Delete posts
- `post:publish` - Publish posts
- `user:view` - View user list
- `user:create` - Create new users
- `user:edit` - Edit user details
- `user:delete` - Delete users
- `comment:view` - View comments
- `comment:create` - Create comments
- `comment:delete` - Delete comments

**Permission Assignments**:

| Permission | Admin | Editor | Author | Viewer |
|-----------|-------|--------|--------|--------|
| post:view | ✓ | ✓ | ✓ | ✓ |
| post:create | ✓ | ✓ | ✓ | ✗ |
| post:edit | ✓ | ✓ | ✓ (own) | ✗ |
| post:delete | ✓ | ✗ | ✗ | ✗ |
| post:publish | ✓ | ✓ | ✗ | ✗ |
| user:* (all) | ✓ | ✗ | ✗ | ✗ |
| comment:view | ✓ | ✓ | ✓ | ✓ |
| comment:create | ✓ | ✓ | ✓ | ✗ |
| comment:delete | ✓ | ✓ | ✗ | ✗ |

---

## Implementation Plan

### Phase 1: MCP Server Foundation

**Tasks**:
1. Create MCP server package structure
2. Implement authentication middleware
3. Expose basic RBAC management tools
4. Add comprehensive error handling
5. Write MCP tool schemas

**Deliverables**:
- Functional MCP server at `/mcp/authhub`
- API documentation for MCP tools
- Authentication flow documentation

### Phase 2: OpenAPI Parser Integration

**Tasks**:
1. Create OpenAPI parsing utility
2. Build resource extraction logic
3. Implement operation → permission mapping
4. Design role inference algorithm
5. Create permission hierarchy builder

**Deliverables**:
- OpenAPI analyzer library
- Mapping rules configuration
- Unit tests for parser

### Phase 3: AI Agent Prompt Engineering

**Tasks**:
1. Design system prompts for RBAC generation
2. Create role inference guidelines
3. Build permission assignment logic
4. Implement conflict resolution strategies
5. Add validation and review steps

**Deliverables**:
- AI agent prompt templates
- RBAC generation guidelines
- Quality assurance checklist

### Phase 4: End-to-End Integration

**Tasks**:
1. Connect MCP server to AuthHub database
2. Integrate OpenAPI parser with AI workflow
3. Build user interface for spec upload
4. Add preview/review before commit
5. Create rollback mechanisms

**Deliverables**:
- Complete RBAC generation pipeline
- Admin UI for OpenAPI-based generation
- Testing and validation suite

---

## User Experience Flow

### Option 1: Admin Dashboard Integration

```
1. Admin navigates to /admin/rbac
2. Clicks "Generate from OpenAPI Spec"
3. Enters OpenAPI spec URL or uploads JSON/YAML file
4. AI analyzes spec and shows preview:
   - Detected resources: posts, users, comments
   - Proposed roles: Admin, Editor, Author, Viewer
   - Permission mappings
5. Admin reviews and adjusts:
   - Rename roles
   - Add/remove permissions
   - Modify role assignments
6. Admin clicks "Create RBAC Model"
7. System creates model using MCP tools
8. Success: Model ready to assign to services
```

### Option 2: API-First Approach

```bash
# Upload OpenAPI spec via API
curl -X POST https://authhub.example.com/api/admin/rbac/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "openapiUrl": "https://api.example.com/openapi.json",
    "modelName": "My Service RBAC",
    "autoApprove": false
  }'

# Response includes preview
{
  "previewId": "preview_123",
  "model": {
    "name": "My Service RBAC",
    "roles": [...],
    "permissions": [...],
    "mappings": [...]
  }
}

# Approve and create
curl -X POST https://authhub.example.com/api/admin/rbac/generate/preview_123/approve \
  -H "Authorization: Bearer $TOKEN"
```

---

## Advanced Features

### 1. **Custom Mapping Rules**

Allow admins to define custom OpenAPI → RBAC mappings:

```yaml
# mapping-rules.yaml
resources:
  pluralize: true           # "post" -> "posts"
  exclude: ["health", "metrics"]

actions:
  GET: "view"
  POST: "create"
  PUT: "update"
  PATCH: "edit"
  DELETE: "delete"

roleInference:
  adminKeywords: ["admin", "system", "superuser"]
  editorKeywords: ["editor", "manager", "moderator"]
  viewerKeywords: ["viewer", "guest", "public"]

customRoles:
  - name: "API Developer"
    permissions: ["*:view", "webhook:*"]
```

### 2. **Incremental Updates**

Detect OpenAPI spec changes and suggest RBAC updates:

```typescript
// AI compares old vs new spec
const diff = compareSpecs(oldSpec, newSpec);

// Suggest changes
const suggestions = {
  newPermissions: ["post:schedule", "post:archive"],
  removedPermissions: [],
  roleAdjustments: [
    {
      role: "Editor",
      add: ["post:schedule"],
      remove: []
    }
  ]
};
```

### 3. **Multi-Version Support**

Handle multiple API versions with separate RBAC models:

```typescript
// Generate versioned models
await generateRbacModel({
  openapiUrl: "https://api.example.com/v1/openapi.json",
  modelName: "My Service RBAC v1"
});

await generateRbacModel({
  openapiUrl: "https://api.example.com/v2/openapi.json",
  modelName: "My Service RBAC v2"
});
```

### 4. **AI-Assisted Review**

After generation, AI provides insights:

```
✓ Generated 3 roles, 12 permissions
⚠ Warning: No admin-level operations detected
ℹ Suggestion: Consider adding a "Super Admin" role for critical operations
✓ Permission hierarchy looks good
✓ No conflicting permissions detected
```

---

## Security Considerations

### 1. **OpenAPI Spec Validation**

- Validate spec format (OpenAPI 3.x)
- Sanitize URLs to prevent SSRF attacks
- Limit spec file size (max 5MB)
- Scan for malicious content

### 2. **MCP Server Authentication**

- Require admin API keys for RBAC modification
- Rate limiting on MCP tool calls
- Audit logging for all operations
- IP whitelisting for production environments

### 3. **AI Agent Sandboxing**

- Limit AI agent to read-only spec analysis
- Require human approval before creating models
- Validate all generated permissions
- Prevent privilege escalation

### 4. **Preview Before Commit**

- Never auto-create RBAC models without review
- Show detailed preview of all changes
- Allow manual adjustments
- Implement rollback mechanisms

---

## Technical Requirements

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "openapi-typescript": "^6.0.0",
    "swagger-parser": "^10.0.0",
    "zod": "^3.22.0"
  }
}
```

### Environment Variables

```bash
# MCP Server Configuration
MCP_SERVER_PORT=3001
MCP_AUTH_REQUIRED=true
MCP_API_KEY_HEADER=X-AuthHub-API-Key

# OpenAPI Generator
OPENAPI_MAX_SPEC_SIZE=5242880  # 5MB
OPENAPI_TIMEOUT=30000          # 30 seconds
AI_MODEL_ENDPOINT=https://api.anthropic.com/v1/messages
AI_MODEL_KEY=sk_...
```

---

## Example MCP Tool Usage

### Creating a Complete RBAC Model

```typescript
// 1. AI agent fetches OpenAPI spec
const spec = await fetchOpenApiSpec("https://api.example.com/openapi.json");

// 2. Create RBAC model
const model = await mcpTools.authhub_create_rbac_model({
  name: "Example Service RBAC",
  description: "Auto-generated from OpenAPI v3.0"
});

// 3. Create roles
const adminRole = await mcpTools.authhub_create_role({
  rbacModelId: model.id,
  name: "Administrator",
  description: "Full system access"
});

const editorRole = await mcpTools.authhub_create_role({
  rbacModelId: model.id,
  name: "Editor",
  description: "Content management"
});

// 4. Create permissions
const viewPostsPerm = await mcpTools.authhub_create_permission({
  rbacModelId: model.id,
  name: "post:view",
  description: "View all posts"
});

const createPostsPerm = await mcpTools.authhub_create_permission({
  rbacModelId: model.id,
  name: "post:create",
  description: "Create new posts"
});

// 5. Assign permissions to roles
await mcpTools.authhub_assign_permissions({
  roleId: adminRole.id,
  permissionIds: [viewPostsPerm.id, createPostsPerm.id]
});

await mcpTools.authhub_assign_permissions({
  roleId: editorRole.id,
  permissionIds: [viewPostsPerm.id, createPostsPerm.id]
});

// 6. Verify creation
const finalModel = await mcpTools.authhub_get_rbac_model({
  modelId: model.id
});

console.log("RBAC Model Created:", finalModel);
```

---

## Benefits

### For Administrators
✅ **Time Savings**: Automatic RBAC generation vs manual creation  
✅ **Accuracy**: Reduces human error in permission mapping  
✅ **Consistency**: Standardized role structures across services  
✅ **Maintenance**: Easy updates when API specs change

### For Developers
✅ **Self-Service**: Generate RBAC models without admin intervention  
✅ **API-First**: Align RBAC with existing API structure  
✅ **Documentation**: RBAC serves as permission documentation  
✅ **Integration**: Seamless connection between API and AuthHub

### For Organizations
✅ **Scalability**: Handle multiple services efficiently  
✅ **Governance**: Consistent permission models  
✅ **Audit Trail**: Track RBAC model generation and changes  
✅ **Compliance**: Ensure all API operations are governed

---

## Future Enhancements

1. **GraphQL Schema Support**: Extend beyond REST APIs
2. **gRPC Proto Files**: Support for gRPC service definitions
3. **Policy as Code**: Export RBAC models as OPA policies
4. **Custom Validators**: Pluggable validation rules
5. **AI Training**: Learn from manual adjustments to improve future generations

---

## Conclusion

By combining **MCP servers**, **OpenAPI specification analysis**, and **AI-powered role inference**, AuthHub can automatically generate comprehensive RBAC models from existing API documentation. This approach:

- Reduces manual configuration overhead
- Ensures consistency between API structure and authorization rules
- Enables rapid onboarding of new services
- Maintains a single source of truth for permissions

The system balances automation with human oversight, allowing administrators to review and refine AI-generated models before deployment.

---

**Document Version**: 1.0  
**Last Updated**: October 27, 2025  
**Status**: Conceptual Design - Ready for Implementation Planning
