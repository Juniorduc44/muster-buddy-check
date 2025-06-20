
# MusterSheets Application - Project Documentation Template
## Version 1.0.0
*Last Updated: December 2024*

---

## 🎯 Project Overview

### Purpose
MusterSheets is a comprehensive web-based attendance tracking application designed for various types of events and gatherings. The application serves both military and civilian use cases, providing flexible attendance management with real-time tracking, QR code generation, and detailed analytics.

### Core Functionality
- **Multi-Event Support**: Templates for military formations, family reunions, class reunions, corporate meetings, and custom events
- **Flexible Data Collection**: Customizable fields including names, contact info, ranks, units, badge numbers, and age
- **Real-time Attendance**: Live attendance tracking with timestamp recording
- **QR Code Integration**: Automatic QR code generation for easy check-ins
- **Analytics & Export**: Comprehensive results dashboard with CSV export capabilities
- **User Authentication**: Google OAuth and email/password authentication via Supabase

### Target Users
- Military personnel for formation musters and inspections
- Event organizers for family reunions and social gatherings
- Educational institutions for class reunions and alumni events
- Corporate teams for meetings and conferences
- General event coordinators for any type of gathering

---

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router DOM v6.26.2
- **State Management**: React Context API with hooks
- **Icons**: Lucide React
- **Charts**: Recharts for analytics visualization

### Backend Infrastructure
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth with Google OAuth integration
- **Real-time Features**: Supabase Realtime (ready for implementation)
- **File Storage**: Not currently implemented but Supabase Storage available

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.50.0",
  "@tanstack/react-query": "^5.56.2",
  "react": "^18.3.1",
  "react-router-dom": "^6.26.2",
  "tailwindcss": "latest",
  "lucide-react": "^0.462.0",
  "recharts": "^2.12.7"
}
```

---

## 📁 File Structure & Organization

### Root Directory Structure
```
├── src/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React Context providers
│   ├── pages/              # Route-based page components
│   ├── integrations/       # External service integrations
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── main.tsx           # Application entry point
├── supabase/
│   └── config.toml        # Supabase configuration
└── public/                # Static assets
```

### Core Components Breakdown

#### `/src/components/`
- **Dashboard.tsx**: Main dashboard displaying user's attendance sheets with stats
- **CreateSheetModal.tsx**: Modal for creating new attendance sheets with templates
- **MusterSheetCard.tsx**: Individual sheet display card with actions
- **AuthForm.tsx**: Authentication form with email/password and Google OAuth
- **ui/**: shadcn/ui component library (buttons, cards, forms, etc.)

#### `/src/pages/`
- **Index.tsx**: Landing page with authentication check
- **AttendancePage.tsx**: Public attendance submission form
- **ResultsPage.tsx**: Analytics dashboard with attendance data and CSV export
- **QRCodePage.tsx**: QR code display for easy sharing
- **NotFound.tsx**: 404 error page

#### `/src/contexts/`
- **AuthContext.tsx**: Authentication state management with Supabase integration

#### `/src/integrations/supabase/`
- **client.ts**: Supabase client configuration
- **types.ts**: Auto-generated TypeScript types from Supabase database

---

## 🗄️ Database Schema & Supabase Implementation

### Database Tables

#### 1. `muster_sheets` Table
**Purpose**: Stores attendance sheet configurations and metadata

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| `creator_id` | uuid | User who created the sheet | NOT NULL, References auth.users |
| `title` | text | Sheet title | NOT NULL |
| `description` | text | Optional description | Nullable |
| `required_fields` | text[] | Array of fields to collect | NOT NULL, DEFAULT ['first_name', 'last_name'] |
| `time_format` | text | Time display format | NOT NULL, DEFAULT 'standard' |
| `is_active` | boolean | Sheet active status | NOT NULL, DEFAULT true |
| `expires_at` | timestamp | Optional expiration date | Nullable |
| `created_at` | timestamp | Creation timestamp | NOT NULL, DEFAULT now() |
| `updated_at` | timestamp | Last update timestamp | NOT NULL, DEFAULT now() |

#### 2. `attendance_records` Table
**Purpose**: Stores individual attendance submissions

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| `id` | uuid | Primary key | NOT NULL, DEFAULT gen_random_uuid() |
| `sheet_id` | uuid | Reference to muster sheet | NOT NULL, FOREIGN KEY |
| `first_name` | text | Attendee first name | NOT NULL |
| `last_name` | text | Attendee last name | NOT NULL |
| `email` | text | Attendee email | Nullable |
| `phone` | text | Attendee phone | Nullable |
| `rank` | text | Military/position rank | Nullable |
| `unit` | text | Unit/department | Nullable |
| `badge_number` | text | Badge/ID number | Nullable |
| `age` | integer | Attendee age | Nullable |
| `timestamp` | timestamp | Check-in time | NOT NULL, DEFAULT now() |
| `created_at` | timestamp | Record creation time | NOT NULL, DEFAULT now() |

### Supabase Authentication Setup

#### Authentication Providers
- **Email/Password**: Native Supabase auth
- **Google OAuth**: Configured with Google Cloud Console
  - Client ID and Secret configured in Supabase dashboard
  - Authorized domains and redirect URLs properly set

#### Row Level Security (RLS)
Currently **disabled** for public access to attendance submission. For enhanced security, implement:
```sql
-- Enable RLS on muster_sheets
ALTER TABLE muster_sheets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sheets
CREATE POLICY "Users can view own sheets" ON muster_sheets
  FOR SELECT USING (auth.uid() = creator_id);

-- Policy: Users can only create sheets for themselves
CREATE POLICY "Users can create own sheets" ON muster_sheets
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
```

#### URL Configuration
- **Site URL**: Set to production domain
- **Redirect URLs**: Include both development and production URLs
- **Email Templates**: Default Supabase templates (customizable)

---

## 🎨 User Interface & Experience

### Design System
- **Color Scheme**: Dark theme with gray-900 background
- **Primary Colors**: Green accent (#10B981) for actions and success states
- **Typography**: Default system fonts with various weights
- **Layout**: Responsive grid system using Tailwind CSS

### Template System
Pre-configured templates for different event types:

1. **Military Formation**
   - Fields: First Name, Last Name, Rank, Unit, Badge Number
   - Time Format: 24-hour (military time)
   - Use Case: Military musters, formations, inspections

2. **Family Reunion**
   - Fields: First Name, Last Name, Email, Phone, Age
   - Time Format: 12-hour (standard)
   - Use Case: Family gatherings, reunions

3. **Class Reunion**
   - Fields: First Name, Last Name, Email, Phone
   - Time Format: 12-hour (standard)
   - Use Case: School reunions, alumni events

4. **Corporate Meeting**
   - Fields: First Name, Last Name, Email, Unit/Department
   - Time Format: 12-hour (standard)
   - Use Case: Business meetings, conferences

5. **General Event**
   - Fields: First Name, Last Name, Email
   - Time Format: 12-hour (standard)
   - Use Case: Any general gathering

6. **Custom Template**
   - Fields: User-selectable from available options
   - Time Format: User-selectable
   - Use Case: Unique requirements

### Available Data Fields
- `first_name` (Required)
- `last_name` (Required)
- `email`
- `phone`
- `rank`
- `unit`
- `badge_number`
- `age`

---

## 🔄 Application Flow

### 1. User Authentication
```
Landing Page → AuthForm → Dashboard
```
- Users can sign up/in with email/password or Google OAuth
- Authentication state managed through React Context
- Automatic redirection based on auth status

### 2. Sheet Creation
```
Dashboard → Create Button → Template Selection → Form Configuration → Sheet Creation
```
- Users select from preset templates or create custom
- Configure required fields, time format, expiration
- Sheet becomes immediately active upon creation

### 3. Attendance Submission
```
Public URL/QR Code → Attendance Form → Data Submission → Confirmation
```
- Public access (no authentication required)
- Form fields dynamically generated based on sheet configuration
- Real-time timestamp recording
- Success confirmation with details

### 4. Results & Analytics
```
Dashboard → Results Button → Analytics View → CSV Export
```
- Real-time attendance statistics
- Visual charts and graphs
- Sortable attendee list
- One-click CSV export functionality

---

## 🔗 API Integration Points

### Supabase Client Configuration
```typescript
const supabase = createClient<Database>(
  "https://ypvoijfxlfxiyoekxgzx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

### Key API Operations

#### Authentication
```typescript
// Sign up
await supabase.auth.signUp({
  email,
  password,
  options: { emailRedirectTo: `${window.location.origin}/` }
});

// Sign in with Google
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/` }
});
```

#### Data Operations
```typescript
// Create attendance sheet
await supabase.from('muster_sheets').insert([sheetData]);

// Submit attendance
await supabase.from('attendance_records').insert([recordData]);

// Fetch results
await supabase
  .from('attendance_records')
  .select('*')
  .eq('sheet_id', sheetId);
```

---

## 🚀 Deployment & Configuration

### Environment Variables
All configuration is handled through Supabase, no environment variables needed in the application code.

### Build Configuration
- **Vite Configuration**: Standard React + TypeScript setup
- **Tailwind Config**: Extended with custom colors and animations
- **TypeScript**: Strict mode enabled with path aliases

### Supabase Project Configuration
- **Project ID**: `ypvoijfxlfxiyoekxgzx`
- **Region**: Auto-selected based on optimal performance
- **Database**: PostgreSQL with automatic backups
- **Auth**: Email and Google OAuth enabled

---

## 📈 Analytics & Reporting

### Dashboard Statistics
- Total sheets created
- Active sheets count
- QR code generation status
- Real-time attendance counts

### Results Page Features
- Attendance timeline visualization
- Participant demographics (when applicable)
- Export capabilities (CSV format)
- Search and filter functionality
- Time-based attendance tracking

---

## 🔒 Security Considerations

### Current Security Model
- **Public Attendance**: No authentication required for attendance submission
- **Creator Authentication**: Required for sheet creation and management
- **Data Validation**: Client-side and server-side validation
- **HTTPS**: Enforced through Supabase and hosting platform

### Future Security Enhancements
- Row Level Security implementation
- Rate limiting for submissions
- Data encryption for sensitive information
- Audit logging for administrative actions

---

## 🛠️ Future Enhancement Opportunities

### Version 1.1.0 Planned Features
- [ ] Real-time attendance updates using Supabase Realtime
- [ ] Email notifications for attendance milestones
- [ ] Advanced analytics with time-series data
- [ ] Mobile app companion
- [ ] Bulk attendee import/export
- [ ] Custom branding options

### Version 1.2.0 Planned Features
- [ ] Multi-language support
- [ ] Advanced role-based permissions
- [ ] Integration with calendar systems
- [ ] Photo capture during check-in
- [ ] Geolocation verification
- [ ] SMS notifications

---

## 📚 Development Guidelines

### Code Standards
- TypeScript strict mode
- ESLint configuration for code quality
- Consistent component structure
- Proper error handling and loading states

### Component Architecture
- Functional components with hooks
- Context for global state management
- Custom hooks for reusable logic
- Proper TypeScript typing throughout

### Best Practices
- Responsive design principles
- Accessibility considerations
- Performance optimization
- SEO-friendly routing

---

## 🐛 Known Issues & Limitations

### Current Limitations
- No offline capability
- Limited to 50MB file storage (Supabase free tier)
- No real-time collaboration features
- Basic analytics visualization

### Performance Considerations
- Large attendance lists may impact load times
- QR code generation is client-side only
- CSV export limited by browser memory

---

## 📞 Support & Maintenance

### Monitoring
- Supabase dashboard for database monitoring
- Application error tracking through browser console
- Performance monitoring through browser dev tools

### Backup Strategy
- Supabase automatic daily backups
- Point-in-time recovery available
- Manual export capabilities for critical data

---

## 📄 License & Usage

This project documentation template is designed for prompt engineering and development reference. The application is built using open-source technologies with appropriate licensing.

---

*This documentation template should be updated with each major version release or significant feature addition. Next update scheduled for Version 1.1.0.*
