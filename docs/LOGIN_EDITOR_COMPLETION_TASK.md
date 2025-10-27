## Task: Complete Login Editor - Method Customization & Management
**What you'll see:** Full-featured login editor with per-method customization controls, config management, and service assignment

**Critical Missing Feature:** The schema supports `buttonText`, `buttonVariant`, and `helpText` customization per method, but there's NO UI to edit these values!

**Changes:**

1. **Method Customization Panel** (Primary feature - expand sidebar items):
   - Add expandable/collapsible accordion for each method in sidebar
   - When expanded, show 3 customization fields per method:
     - Input: "Button Text" (overrides defaultButtonText, placeholder shows default)
     - Select: "Button Variant" (default/outline/ghost/secondary, shows current or default)
     - Textarea: "Help Text" (overrides defaultHelpText, placeholder shows default)
   - Add "Coming Soon Badge" checkbox (showComingSoonBadge field)
   - Update methodsState when any field changes
   - Show "Using default" indicator when override is null

2. **Default Method Selector**:
   - Add dropdown in left panel header: "Default Active Method"
   - Populate with enabled Primary/Secondary methods only
   - Update formData.defaultMethod on change
   - Sync with preview's initial active state

3. **Configuration Management**:
   - Add "Delete Configuration" button (with confirmation dialog)
   - Add "Duplicate Configuration" button (creates copy with " (Copy)" suffix)
   - Add "Assign to Service" dropdown (null = unassigned, or select from globalServices)
   - Update backend: DELETE `/api/admin/login-config/:id` endpoint
   - Update backend: POST `/api/admin/login-config/:id/duplicate` endpoint
   - Update backend: PATCH to support serviceId assignment

4. **Enhanced Preview**:
   - Display customized helpText below Primary/Secondary buttons (if set)
   - Use customized buttonText on all method buttons (fallback to default)
   - Use customized buttonVariant for alternative method buttons
   - Show "Coming Soon" badges when showComingSoonBadge is true

5. **Persistence**:
   - Save buttonText, buttonVariant, helpText, showComingSoonBadge in mutation
   - Update PUT `/api/admin/service-auth-methods/order` to accept these fields
   - Ensure null values preserve (don't send empty strings, send null)

**UI Layout Change:**
Replace current compact method items with accordion:
```
[Grip] [Icon] Method Name [Category Badge] [Switch]
  └─ [Expanded Panel]
     │ Button Text: [_______________] (placeholder: "Login with Email")
     │ Variant: [Select: outline ▼]
     │ Help Text: [________________] (placeholder: default help)
     └ ☐ Show "Coming Soon" badge
```

**Acceptance Criteria:**
- Click method in sidebar → expands customization panel
- Edit button text → preview updates immediately
- Change variant → alternative method button style changes
- Set help text → appears below Primary/Secondary in preview
- Toggle "Coming Soon" → badge appears/disappears in preview
- Select default method → preview shows that method's form on load
- Delete config → confirmation dialog → removed from list
- Duplicate config → creates new config with all settings copied
- Assign to service → updates serviceId, visible in Services table
