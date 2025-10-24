# Login Page Visual Editor - CMS-Like Interactive Editing

## Task: Full-Screen Visual Login Editor - Full Stack
**What you'll see:** Click-to-edit interface where admins modify login page appearance in real-time with inline editing, similar to modern website builders

**Changes:**
1. **Frontend**: Add "Visual Editor" button to login editor page (alongside Branding, Auth Methods)
2. **Frontend**: Full-screen preview of login page with editable overlays
3. **Frontend**: Click on title → inline text input appears with "Save" / "Cancel" buttons
4. **Frontend**: Click on logo → file upload dialog opens, preview updates immediately
5. **Frontend**: Click on auth method button → opens customization popover (text, variant, order)
6. **Frontend**: Drag-and-drop auth method cards to reorder (visual handles on hover)
7. **Frontend**: Click on colors → color picker overlay appears, changes apply live
8. **Frontend**: Add element outline on hover showing "Click to edit" tooltip
9. **Frontend**: Floating toolbar with undo/redo, preview mode toggle, responsive view switcher
10. **Frontend**: Auto-save indicator showing "Saving..." → "All changes saved"
11. **Backend**: Update `PATCH /api/admin/login-interfaces/:id` to accept partial updates
12. **Test in browser**:
    - Click "Visual Editor" tab → see full-screen preview
    - Click on "Welcome to AuthHub" title → inline input appears
    - Type new title "Enterprise Portal" → press Enter → auto-saves
    - Click on logo → upload new image → see immediate update
    - Hover over auth button → drag handle appears → reorder methods
    - Click primary color → color picker appears → select new color → live preview updates
    - Toggle responsive view → see mobile/tablet/desktop layouts
    - All changes persist on page refresh

**Visual Editor UI:**
```
┌─────────────────────────────────────────────────┐
│ [← Back] [Undo] [Redo] [💾 Saved] [📱 Desktop ▼]│
├─────────────────────────────────────────────────┤
│                                                 │
│         ┌───────────────────────┐              │
│         │  [Click to edit logo] │ ← Hover hint │
│         │                       │              │
│         │  Welcome to AuthHub   │ ← Click edits│
│         │  Choose auth method   │              │
│         │                       │              │
│         │  [≡ UUID Login     ]  │ ← Drag handle│
│         │  [≡ Email Login    ]  │              │
│         │                       │              │
│         └───────────────────────┘              │
│                                                 │
└─────────────────────────────────────────────────┘
```

**UI Location:** /admin/interfaces/:id/edit - new "Visual Editor" tab

**Acceptance:** Admins can edit login page appearance through direct manipulation with instant visual feedback and auto-save
