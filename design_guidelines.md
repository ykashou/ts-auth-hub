# Unified Authentication System - Design Guidelines

## Design Approach
**System-Based with Custom Branding**: Utility-focused authentication service with a professional, trustworthy aesthetic inspired by the provided Quest Log screenshot. Emphasis on clarity, security, and seamless integration.

## Core Design Principles
1. **Trust & Security First**: Clean, professional appearance that instills confidence
2. **Card-Based Architecture**: All forms and content sections contained in elevated white cards
3. **Centered Layouts**: Forms and primary content centrally aligned for focus
4. **Minimal but Purposeful**: No unnecessary decorative elements, every component serves a function

## Color Palette

**Primary Colors:**
- Primary: `#12008f` (deep blue) - primary buttons, links, active states
- Background: `#f0f0f0` (off-white) - page background
- Card: `#fcfcfc` (white) - all card backgrounds, form containers
- Text: `#1a1a1a` (dark) - primary text, headings

**Secondary Colors:**
- Secondary: `#c4c4c4` (light grey) - borders, inactive states, dividers
- Accent: `9 75% 61%` (coral) - error states, destructive actions, important highlights

**Functional Colors:**
- Success: `142 76% 36%` (green)
- Error: `9 75% 61%` (coral - matches accent)
- Warning: `38 92% 50%` (amber)

## Typography

**Font Family:** Poppins (Google Fonts)
- Headings: Poppins, weights 600-700
- Body: Poppins, weight 400
- Labels: Poppins, weight 500
- Buttons: Poppins, weight 500

**Type Scale:**
- H1: 2rem (32px) - Page titles
- H2: 1.5rem (24px) - Section headers
- H3: 1.25rem (20px) - Card titles
- Body: 0.875rem (14px) - Form labels, descriptions
- Small: 0.75rem (12px) - Helper text, metadata

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8
- Micro spacing: `p-2`, `gap-2` (8px)
- Standard spacing: `p-4`, `gap-4` (16px)
- Section spacing: `p-6`, `gap-6` (24px)
- Large spacing: `p-8`, `gap-8` (32px)

**Container Widths:**
- Forms: `max-w-md` (28rem/448px)
- Admin dashboard: `max-w-6xl` (72rem/1152px)
- Cards: Full width with internal padding

**Grid System:**
- Admin table: Single column on mobile, multi-column table on desktop
- API key cards: Grid of 2-3 columns on larger screens

## Component Library

**Cards:**
- Background: `#fcfcfc`
- Border radius: `0.8rem` (12.8px)
- Shadow: Minimal - `shadow-sm` or `shadow-md`
- Padding: `p-6` to `p-8`

**Forms:**
- Input fields: White background, `#c4c4c4` border, rounded `0.8rem`
- Focus state: `#12008f` border, subtle shadow
- Labels: `#1a1a1a`, positioned above inputs, weight 500
- Helper text: `#6b7280`, size 0.75rem below inputs

**Buttons:**
- Primary: `#12008f` background, white text, rounded `0.8rem`
- Secondary: `#c4c4c4` background, `#1a1a1a` text
- Destructive: Coral accent background, white text
- Padding: `px-6 py-3` for standard buttons
- Hover: Slightly darker shade, no dramatic transitions

**Navigation:**
- Simple top bar with logo/title on left
- User menu/logout on right for authenticated users
- Background: `#fcfcfc`, subtle bottom border

**Tables (Admin Dashboard):**
- Headers: `#f9fafb` background, bold text
- Rows: Alternating white/very light grey
- Borders: `#c4c4c4` subtle dividers
- Cell padding: `p-4`
- Actions column: Icon buttons aligned right

**Data Display:**
- UUID display: Monospace font, light grey background box
- Status badges: Small rounded pills with colored backgrounds
- Timestamps: Small grey text, consistent formatting

**Alerts/Messages:**
- Success: Green background with darker green text
- Error: Coral background with white text
- Info: Light blue background with dark blue text
- Border radius: `0.8rem`, padding `p-4`

## Page-Specific Layouts

**Login/Registration Pages:**
- Centered card on off-white background
- Form width: `max-w-md`
- Logo/title centered above card
- Single column form layout
- "Don't have an account?" / "Already have an account?" link below form
- No hero images - focus entirely on the form

**Admin Dashboard:**
- Two-column layout: Sidebar navigation + main content area
- User table with columns: UUID, Email, Created Date, Status, Actions
- Search/filter controls above table
- Pagination at bottom
- Add new user button (primary color) in top right

**API Documentation Page:**
- Clean, technical layout with code examples
- Endpoint cards showing method, path, parameters
- Example request/response in monospace font
- Copy buttons for code snippets

## Images
No hero images or decorative imagery. This is a utility-focused authentication service where trust and clarity are paramount. All visual weight should be on the clean, professional UI components.

## Animations
**Minimal and Functional Only:**
- Smooth transitions on hover states (150ms)
- Form validation feedback (subtle shake on error)
- Loading spinners for async operations
- No decorative animations or scroll effects

## Accessibility
- All form inputs have associated labels
- Focus states clearly visible with `#12008f` outline
- Color contrast meets WCAG AA standards
- Error messages announced to screen readers
- Keyboard navigation fully supported