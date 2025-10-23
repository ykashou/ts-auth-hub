# AuthHub Admin Interface - Design Guidelines

## Design Approach

**Selected Approach**: Custom Design System with Modern Admin Dashboard References (Linear, Vercel, Supabase)

Drawing inspiration from Linear's data-dense elegance and Vercel's minimalist admin interfaces while applying the "Arcane Blue" mystical aesthetic. This creates a professional admin tool with distinctive visual identity that enhances rather than distracts from functionality.

**Core Principles**:
- Information hierarchy through card elevation and spacing
- Mystical blue theme provides visual distinction without sacrificing usability
- Data-first layout with supporting decorative elements
- Efficient workflows for complex role assignment operations

---

## Typography System

**Font Family**: Poppins (via Google Fonts CDN)

**Hierarchy**:
- Page Titles: Poppins SemiBold, 32px (2xl), tracking tight
- Section Headers: Poppins Medium, 24px (xl), tracking normal
- Card Titles: Poppins Medium, 18px (lg), tracking normal
- Body Text: Poppins Regular, 14px (sm), tracking normal, line-height relaxed
- Labels/Meta: Poppins Medium, 12px (xs), uppercase, tracking wider
- Data Tables: Poppins Regular, 14px (sm), tabular numbers
- Buttons: Poppins SemiBold, 14px (sm), tracking normal

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8 for consistency
- Micro spacing: 2 units (8px)
- Standard gaps: 4 units (16px)
- Card padding: 6 units (24px)
- Section spacing: 8 units (32px)
- Major divisions: 12 units (48px)

**Grid Structure**:
- Main container: max-w-7xl with px-6
- Two-column layout: 1/3 sidebar (fixed 320px) + 2/3 main content
- Card grids: 2-3 columns on desktop, single column mobile
- Data tables: Full-width with horizontal scroll on mobile

---

## Component Library

### Navigation & Layout

**Top Navigation Bar**:
- Fixed header, full-width, h-16
- Logo left, user profile/settings right
- Subtle gradient backdrop with blur effect
- Breadcrumb navigation showing: Dashboard → Services → [Service Name] → Role Management
- Quick search bar (center) with mystical glow on focus

**Sidebar Navigation** (optional secondary nav):
- Sticky sidebar, 280px wide
- Hierarchical service tree with expand/collapse
- Active state with mystical glow accent
- Role count badges on each service

### Primary Content Sections

**Page Header**:
- Service name as primary heading with service icon
- RBAC model indicator badge (e.g., "Standard RBAC", "Hierarchical RBAC")
- Action buttons right-aligned: "Add User", "Bulk Import", "Export Assignments"
- Tabs below header: "User Assignments", "Role Overview", "Permissions Matrix", "Audit Log"

**User-Role Assignment Panel** (Main Feature):
Card-based layout containing:

**Assignment Creation Card**:
- Three-column selection interface
- Column 1: User selector (searchable dropdown with avatar thumbnails)
- Column 2: Service selector (hierarchical tree, pre-selected)
- Column 3: Role selector (filtered by service's RBAC model)
- Large "Assign Role" button at bottom with mystical shimmer effect
- Preview panel showing effective permissions before assignment

**Active Assignments Table**:
- Card containing data table
- Columns: User (with avatar), Email, Assigned Role, Service Scope, Assigned Date, Actions
- Row hover highlights with subtle glow
- Inline actions: Edit, Revoke, View Permissions
- Batch selection checkboxes for bulk operations
- Pagination controls at bottom
- Filter toggles above table: "All Roles", "Admin", "Manager", "Viewer", "Custom"
- Search bar for user filtering

**Role Hierarchy Visualization Card**:
- Interactive org-chart style diagram showing role inheritance
- Nodes represent roles with permission counts
- Connecting lines show hierarchy relationships
- Clickable nodes expand to show detailed permissions
- Legend indicating permission levels with mystical color coding

### Supporting Components

**Stats Overview Cards** (Above main content):
Three-card horizontal grid showing:
1. Total Users Assigned (large number with trend indicator)
2. Active Roles (count with breakdown by type)
3. Recent Changes (count with timestamp of last modification)

Each card: gradient background, large number typography, subtle icon, micro trend chart

**Service Information Sidebar** (Right side):
- Fixed-width card (300px)
- Service metadata: Created date, Owner, RBAC Model type
- Quick stats: Total users, Total roles, Permission groups
- Related services list with quick-switch links
- Documentation/help links

**Permission Details Modal**:
- Full-screen overlay with centered content card
- Header: Role name, service name, assigned user
- Grid layout of permission categories
- Each permission: checkbox state (read/write/admin), description, scope
- Comparison view option (compare two roles side-by-side)
- Action buttons: "Save Changes", "Cancel", "Copy Role"

**User Profile Cards**:
- Compact card design for user lists
- Avatar (left), Name/Email (center), Role badges (right)
- Hover reveals quick actions menu
- Status indicator (active/inactive)
- Last login timestamp

### Forms & Inputs

**Search Fields**:
- Rounded corners (8px radius)
- Mystical blue border on focus with glow effect
- Icon prefix (magnifying glass from Heroicons)
- Placeholder text with reduced opacity
- Instant results dropdown with card-style items

**Dropdowns/Selects**:
- Custom styled with card appearance
- Rounded corners matching theme
- Options displayed as individual cards within dropdown
- Multi-select with pill-style tags
- Clear "X" button for selections

**Action Buttons**:
- Primary: Solid background, white text, medium shadow, rounded-lg
- Secondary: Outline style, theme border, transparent background
- Danger: Red accent for revoke/delete actions
- Icon buttons: Square, padding-2, icon size 5
- Floating action button (bottom-right): "Quick Assign" with plus icon

**Toggle Switches**:
- Used for enabling/disabling user access
- Mystical blue when active
- Smooth animation on state change
- Label positioned left of switch

### Data Display

**Badges**:
- Role badges: Pill-shaped, small padding, uppercase text
- Admin roles: Gradient background with glow
- Standard roles: Solid background
- Custom roles: Outlined style with dashed border
- Permission level indicators: Icon + text combination

**Empty States**:
- Centered content with illustration placeholder comment
- Heading: "No users assigned yet"
- Description: Helpful text about getting started
- Primary CTA: "Assign First User" button
- Secondary link: "Import from CSV"

**Loading States**:
- Skeleton screens matching card layouts
- Pulsing animation with mystical blue glow
- Loading spinner for inline actions
- Progress bars for bulk operations

---

## Images

**No hero image required** - this is an admin tool focused on functionality.

**Icon Assets**:
Use Heroicons via CDN for all interface icons:
- User icons, role shields, permission locks
- Navigation arrows, search, filter icons
- Action icons (edit, delete, copy, export)
- Status indicators (check, warning, error)

**Avatar Placeholders**:
When user avatars aren't available, use:
- Colored circle backgrounds with initials
- Colors assigned deterministically by user ID
- Consistent size: 32px for table rows, 40px for cards, 64px for profile views

**Decorative Elements**:
- Subtle mystical particle effects (CSS-based) in card backgrounds
- Gradient mesh overlays on primary cards
- Glow effects on interactive elements (focus/hover states)

---

## Accessibility & Interaction

- All interactive elements have 44px minimum touch target
- Focus indicators using mystical blue glow (3px outline)
- Keyboard navigation for all table rows and forms
- ARIA labels on all icon-only buttons
- Form validation with inline error messages (red accent)
- Success confirmations using toast notifications (top-right)
- Confirmation dialogs for destructive actions (role revocation)

---

**Animation**: Minimal, purposeful only
- Fade-in for modal overlays (200ms)
- Slide-down for dropdown menus (150ms)
- Pulse for loading states
- Smooth hover transitions (100ms)
- No scroll animations or parallax effects