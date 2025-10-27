# Login Configuration Versioning - Git-Based History

## Task: Git-Based Configuration Versioning - Full Stack
**What you'll see:** Login interface changes tracked as git commits with version history, diff viewing, and rollback capabilities

**Changes:**
1. **Schema**: Add `configVersion` text field to `loginInterfaces` table (stores git commit SHA)
2. **Backend**: Create `server/versioning/ConfigVersioning.ts` module for git operations
3. **Backend**: On interface save, serialize config to JSON and commit to `config/login-interfaces/{id}.json`
4. **Backend**: Git commit message format: `"Update interface: {name} by {adminEmail} - {timestamp}"`
5. **Backend**: Create `GET /api/admin/login-interfaces/:id/versions` endpoint (returns git log)
6. **Backend**: Create `GET /api/admin/login-interfaces/:id/diff?from=SHA&to=SHA` endpoint (git diff)
7. **Backend**: Create `POST /api/admin/login-interfaces/:id/rollback` endpoint (checkout previous version)
8. **Frontend**: Add "Version History" tab to interface editor
9. **Frontend**: Timeline view showing all commits with timestamps, author, change summary
10. **Frontend**: Click commit → view full diff highlighting changed fields (title, colors, methods)
11. **Frontend**: "Rollback to this version" button on each commit
12. **Frontend**: Confirmation dialog before rollback: "Restore interface to version from {date}?"
13. **Test in browser**:
    - Edit interface "Enterprise Dark" title → save → git commit created
    - Navigate to "Version History" tab → see commit with timestamp
    - Edit colors → save → new commit appears
    - Click on earlier commit → see diff: "title changed", "primaryColor changed"
    - Click "Rollback" → confirmation dialog → confirm → interface restored to previous state
    - Version history shows new commit: "Rollback to version {SHA}"

**Git Structure:**
```
config/
  login-interfaces/
    abc-123-uuid.json    ← Each interface as JSON file
    def-456-uuid.json
  .git/                  ← Version history
```

**JSON Format:**
```json
{
  "id": "abc-123",
  "name": "Enterprise Dark",
  "title": "Welcome",
  "primaryColor": "#1e40af",
  "authMethods": [
    { "id": "uuid", "enabled": true, "displayOrder": 0 }
  ]
}
```

**UI Location:** /admin/interfaces/:id/edit - new "Version History" tab with timeline and diff viewer

**Acceptance:** All interface changes tracked as git commits, admins can view version history with diffs and rollback to previous configurations
