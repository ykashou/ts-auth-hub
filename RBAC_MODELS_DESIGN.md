# AuthHub RBAC Models Design Document

## Overview
This document outlines the comprehensive RBAC (Role-Based Access Control) models to be seeded by default in AuthHub. These models are designed to match the 8 default services and provide realistic, production-ready authorization patterns for various SaaS application types.

## Design Principles

1. **Service-Aligned**: Each RBAC model corresponds to a specific service type and its unique authorization needs
2. **Hierarchical Roles**: Roles follow clear hierarchies with increasing privileges
3. **Granular Permissions**: Permissions are fine-grained, following resource:action naming conventions
4. **Realistic Use Cases**: Models reflect real-world application scenarios
5. **Reusability**: Models can be attached to multiple services of the same type

---

## RBAC Model 1: Git-Based Portfolio Platform
**Applies to:** Git Garden

### Description
RBAC model for Git-based portfolio and project showcase platforms where users manage repositories, projects, and public profiles.

### Roles

#### 1. Portfolio Owner
- **Description**: Full control over their portfolio, projects, settings, and integrations
- **Use Case**: Individual developers managing their own portfolio site

#### 2. Collaborator
- **Description**: Can contribute to projects, edit content, but cannot manage critical settings
- **Use Case**: Team members working on joint projects

#### 3. Viewer
- **Description**: Read-only access to public portfolios and projects
- **Use Case**: Recruiters, clients, or visitors browsing portfolios

### Permissions

**Repository Management**
- `repository:create` - Create new repositories
- `repository:read` - View repository details
- `repository:update` - Edit repository information
- `repository:delete` - Remove repositories
- `repository:sync` - Sync with Git providers

**Project Management**
- `project:create` - Create new projects
- `project:read` - View projects
- `project:update` - Edit project details
- `project:delete` - Remove projects
- `project:publish` - Make projects publicly visible

**Profile Management**
- `profile:view` - View profile information
- `profile:edit` - Edit personal profile
- `profile:customize` - Customize portfolio theme/layout

**Integration Management**
- `integration:connect` - Connect to GitHub/GitLab
- `integration:disconnect` - Remove Git integrations
- `integration:view` - View connected services

### Permission Mapping

| Permission | Portfolio Owner | Collaborator | Viewer |
|-----------|----------------|--------------|--------|
| repository:* (all) | ✓ | ✓ (read/update only) | ✗ |
| project:* (all) | ✓ | ✓ (read/update only) | ✗ |
| profile:view | ✓ | ✓ | ✓ |
| profile:edit | ✓ | ✗ | ✗ |
| profile:customize | ✓ | ✗ | ✗ |
| integration:* (all) | ✓ | ✗ | ✗ |

---

## RBAC Model 2: Fitness & Wellness Platform
**Applies to:** Iron Path

### Description
RBAC model for fitness tracking, workout planning, and wellness coaching platforms.

### Roles

#### 1. Coach/Trainer
- **Description**: Creates workout plans, tracks client progress, manages programs
- **Use Case**: Personal trainers managing multiple clients

#### 2. Premium Member
- **Description**: Full access to workouts, tracking, analytics, and custom plans
- **Use Case**: Paying subscribers with advanced features

#### 3. Basic Member
- **Description**: Access to basic workouts and tracking features
- **Use Case**: Free tier users with limited functionality

#### 4. Nutritionist
- **Description**: Manages meal plans, nutrition tracking, and dietary guidance
- **Use Case**: Nutrition specialists working with clients

### Permissions

**Workout Management**
- `workout:view` - View workout library
- `workout:create` - Create custom workouts
- `workout:edit` - Modify workout plans
- `workout:delete` - Remove workouts
- `workout:assign` - Assign workouts to clients

**Progress Tracking**
- `progress:view` - View fitness progress
- `progress:log` - Log workouts and exercises
- `progress:analytics` - Access detailed analytics

**Client Management** (Coach-specific)
- `client:view` - View client list
- `client:manage` - Add/remove clients
- `client:progress` - View client progress

**Nutrition Management**
- `nutrition:view` - View meal plans
- `nutrition:create` - Create meal plans
- `nutrition:track` - Track nutrition intake

**Program Management**
- `program:view` - View training programs
- `program:create` - Create training programs
- `program:enroll` - Enroll in programs

### Permission Mapping

| Permission | Coach/Trainer | Premium Member | Basic Member | Nutritionist |
|-----------|--------------|----------------|--------------|--------------|
| workout:view | ✓ | ✓ | ✓ | ✓ |
| workout:create | ✓ | ✓ | ✗ | ✗ |
| workout:assign | ✓ | ✗ | ✗ | ✗ |
| progress:* (all) | ✓ | ✓ | ✓ (view/log only) | ✓ |
| client:* (all) | ✓ | ✗ | ✗ | ✓ |
| nutrition:view | ✓ | ✓ | ✓ | ✓ |
| nutrition:create | ✗ | ✗ | ✗ | ✓ |
| program:* (all) | ✓ | ✓ | ✓ (view/enroll only) | ✓ |

---

## RBAC Model 3: Wealth Management & Financial Platform
**Applies to:** PurpleGreen

### Description
RBAC model for financial management, accounting, and wealth tracking systems with strict permission hierarchies.

### Roles

#### 1. Account Owner
- **Description**: Full control over financial accounts, settings, and data
- **Use Case**: Primary account holder

#### 2. Financial Advisor
- **Description**: Can view accounts, create reports, make recommendations
- **Use Case**: Professional advisors managing client portfolios

#### 3. Accountant
- **Description**: Manages transactions, reconciliation, and tax documents
- **Use Case**: CPAs and bookkeepers handling finances

#### 4. Family Member
- **Description**: Limited access to view financial overview and specific accounts
- **Use Case**: Trusted family members with read-only access

#### 5. Auditor
- **Description**: Read-only access to all financial records for compliance
- **Use Case**: External auditors reviewing financial data

### Permissions

**Account Management**
- `account:view` - View account details
- `account:create` - Create new accounts
- `account:edit` - Modify account information
- `account:delete` - Remove accounts
- `account:reconcile` - Reconcile transactions

**Transaction Management**
- `transaction:view` - View transactions
- `transaction:create` - Record new transactions
- `transaction:edit` - Modify transactions
- `transaction:delete` - Remove transactions
- `transaction:categorize` - Categorize expenses/income

**Reporting & Analytics**
- `report:view` - View financial reports
- `report:generate` - Create custom reports
- `report:export` - Export financial data
- `analytics:dashboard` - Access analytics dashboard

**Investment Management**
- `investment:view` - View investment portfolio
- `investment:trade` - Execute trades
- `investment:rebalance` - Rebalance portfolio

**Settings & Security**
- `settings:view` - View settings
- `settings:edit` - Modify configuration
- `security:manage` - Manage security settings

### Permission Mapping

| Permission | Account Owner | Financial Advisor | Accountant | Family Member | Auditor |
|-----------|--------------|------------------|-----------|--------------|---------|
| account:view | ✓ | ✓ | ✓ | ✓ | ✓ |
| account:create/edit/delete | ✓ | ✗ | ✓ | ✗ | ✗ |
| transaction:view | ✓ | ✓ | ✓ | ✓ | ✓ |
| transaction:create/edit | ✓ | ✗ | ✓ | ✗ | ✗ |
| report:* (all) | ✓ | ✓ | ✓ | ✓ (view only) | ✓ |
| investment:view | ✓ | ✓ | ✓ | ✓ | ✓ |
| investment:trade | ✓ | ✗ | ✗ | ✗ | ✗ |
| settings:* (all) | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## RBAC Model 4: Payment Processing Platform
**Applies to:** BTCPay Dashboard

### Description
RBAC model for cryptocurrency payment processing, merchant tools, and transaction management with security-focused permissions.

### Roles

#### 1. Merchant Owner
- **Description**: Full administrative access to merchant account and payment settings
- **Use Case**: Business owner managing payment infrastructure

#### 2. Store Manager
- **Description**: Manages stores, invoices, and customer payments
- **Use Case**: E-commerce manager handling daily operations

#### 3. Accountant
- **Description**: Access to financial reports, invoices, and transaction history
- **Use Case**: Financial staff managing bookkeeping

#### 4. Developer
- **Description**: Manages API keys, webhooks, and technical integrations
- **Use Case**: Technical staff integrating payment systems

#### 5. Support Agent
- **Description**: View-only access to help customers with payment issues
- **Use Case**: Customer support investigating payment problems

### Permissions

**Store Management**
- `store:view` - View store details
- `store:create` - Create new stores
- `store:edit` - Modify store configuration
- `store:delete` - Remove stores

**Invoice & Payment Management**
- `invoice:view` - View invoices
- `invoice:create` - Create payment invoices
- `invoice:refund` - Process refunds
- `payment:view` - View payment transactions
- `payment:process` - Process payments manually

**Wallet Management**
- `wallet:view` - View wallet balances
- `wallet:send` - Send cryptocurrency
- `wallet:receive` - Generate receive addresses

**API & Integration**
- `api:view` - View API configurations
- `api:manage` - Create/revoke API keys
- `webhook:manage` - Configure webhooks

**Reporting & Security**
- `report:view` - View transaction reports
- `report:export` - Export financial data
- `security:settings` - Manage security configuration
- `security:audit` - View security audit logs

### Permission Mapping

| Permission | Merchant Owner | Store Manager | Accountant | Developer | Support Agent |
|-----------|---------------|--------------|-----------|-----------|--------------|
| store:* (all) | ✓ | ✓ (view/edit only) | ✗ | ✗ | ✗ |
| invoice:view | ✓ | ✓ | ✓ | ✓ | ✓ |
| invoice:create/refund | ✓ | ✓ | ✗ | ✗ | ✗ |
| payment:* (all) | ✓ | ✓ | ✓ (view only) | ✓ (view only) | ✓ (view only) |
| wallet:view | ✓ | ✓ | ✓ | ✗ | ✗ |
| wallet:send | ✓ | ✗ | ✗ | ✗ | ✗ |
| api:* (all) | ✓ | ✗ | ✗ | ✓ | ✗ |
| webhook:manage | ✓ | ✗ | ✗ | ✓ | ✗ |
| report:* (all) | ✓ | ✓ | ✓ | ✓ (view only) | ✓ (view only) |
| security:* (all) | ✓ | ✗ | ✗ | ✓ (audit only) | ✓ (audit only) |

---

## RBAC Model 5: Gamification & Achievement Platform
**Applies to:** Quest Armory

### Description
RBAC model for quest-based systems, achievements, challenges, and gamification platforms.

### Roles

#### 1. Game Master
- **Description**: Creates quests, manages challenges, and configures achievement systems
- **Use Case**: Platform administrators and content creators

#### 2. Quest Designer
- **Description**: Designs and publishes quests and challenges
- **Use Case**: Content designers creating engaging quests

#### 3. Player
- **Description**: Participates in quests, earns achievements, tracks progress
- **Use Case**: End users engaging with the platform

#### 4. Moderator
- **Description**: Reviews quest submissions, moderates content
- **Use Case**: Community moderators ensuring quality

### Permissions

**Quest Management**
- `quest:view` - View available quests
- `quest:create` - Create new quests
- `quest:edit` - Modify quest details
- `quest:delete` - Remove quests
- `quest:publish` - Publish quests to players
- `quest:participate` - Join and complete quests

**Achievement Management**
- `achievement:view` - View achievements
- `achievement:create` - Create new achievements
- `achievement:award` - Award achievements to players
- `achievement:revoke` - Revoke achievements

**Challenge Management**
- `challenge:view` - View challenges
- `challenge:create` - Create challenges
- `challenge:join` - Participate in challenges
- `challenge:moderate` - Review and approve challenges

**Leaderboard & Progress**
- `leaderboard:view` - View leaderboards
- `progress:track` - Track personal progress
- `progress:view` - View player statistics

**Rewards Management**
- `reward:view` - View available rewards
- `reward:create` - Create rewards
- `reward:claim` - Claim earned rewards
- `reward:grant` - Grant rewards to players

### Permission Mapping

| Permission | Game Master | Quest Designer | Player | Moderator |
|-----------|------------|---------------|--------|-----------|
| quest:view | ✓ | ✓ | ✓ | ✓ |
| quest:create/edit/delete | ✓ | ✓ | ✗ | ✗ |
| quest:publish | ✓ | ✓ | ✗ | ✗ |
| quest:participate | ✓ | ✓ | ✓ | ✓ |
| achievement:view | ✓ | ✓ | ✓ | ✓ |
| achievement:create | ✓ | ✓ | ✗ | ✗ |
| achievement:award/revoke | ✓ | ✗ | ✗ | ✓ |
| challenge:* (all) | ✓ | ✓ | ✓ (view/join only) | ✓ |
| leaderboard:view | ✓ | ✓ | ✓ | ✓ |
| progress:* (all) | ✓ | ✓ | ✓ (track only) | ✓ |
| reward:view | ✓ | ✓ | ✓ | ✓ |
| reward:create | ✓ | ✓ | ✗ | ✗ |
| reward:claim | ✓ | ✓ | ✓ | ✓ |
| reward:grant | ✓ | ✗ | ✗ | ✓ |

---

## RBAC Model 6: Monitoring & Health Check Platform
**Applies to:** Git Healthz

### Description
RBAC model for service health monitoring, uptime tracking, and incident management systems.

### Roles

#### 1. Platform Admin
- **Description**: Full control over monitoring systems, alerts, and configurations
- **Use Case**: DevOps/SRE team leads

#### 2. Site Reliability Engineer
- **Description**: Manages monitors, responds to incidents, configures alerts
- **Use Case**: SRE team members handling on-call duties

#### 3. Developer
- **Description**: Views service health, creates basic monitors for their services
- **Use Case**: Development team monitoring their own services

#### 4. Operations Viewer
- **Description**: Read-only access to dashboards and incident reports
- **Use Case**: Stakeholders monitoring system health

### Permissions

**Monitor Management**
- `monitor:view` - View monitoring configurations
- `monitor:create` - Create new monitors
- `monitor:edit` - Modify monitor settings
- `monitor:delete` - Remove monitors
- `monitor:enable` - Enable/disable monitors

**Incident Management**
- `incident:view` - View active incidents
- `incident:create` - Create incident reports
- `incident:acknowledge` - Acknowledge incidents
- `incident:resolve` - Mark incidents as resolved
- `incident:postmortem` - Create postmortem reports

**Alert Configuration**
- `alert:view` - View alert rules
- `alert:create` - Create alert rules
- `alert:edit` - Modify alerts
- `alert:silence` - Silence noisy alerts

**Dashboard & Metrics**
- `dashboard:view` - View health dashboards
- `dashboard:create` - Create custom dashboards
- `metrics:view` - View detailed metrics
- `metrics:export` - Export metric data

**Integration Management**
- `integration:view` - View connected services
- `integration:configure` - Configure integrations (Slack, PagerDuty)

### Permission Mapping

| Permission | Platform Admin | SRE | Developer | Operations Viewer |
|-----------|---------------|-----|-----------|------------------|
| monitor:view | ✓ | ✓ | ✓ | ✓ |
| monitor:create/edit | ✓ | ✓ | ✓ (own services only) | ✗ |
| monitor:delete | ✓ | ✓ | ✗ | ✗ |
| incident:view | ✓ | ✓ | ✓ | ✓ |
| incident:create | ✓ | ✓ | ✓ | ✗ |
| incident:acknowledge/resolve | ✓ | ✓ | ✓ | ✗ |
| incident:postmortem | ✓ | ✓ | ✓ | ✗ |
| alert:* (all) | ✓ | ✓ | ✓ (view/create only) | ✗ |
| dashboard:view | ✓ | ✓ | ✓ | ✓ |
| dashboard:create | ✓ | ✓ | ✓ | ✗ |
| metrics:* (all) | ✓ | ✓ | ✓ | ✓ (view only) |
| integration:* (all) | ✓ | ✓ | ✗ | ✗ |

---

## RBAC Model 7: Academic Knowledge Management
**Applies to:** Academia Vault

### Description
RBAC model for academic resource management, research collaboration, and educational content platforms.

### Roles

#### 1. Administrator
- **Description**: Manages the entire platform, users, and institutional settings
- **Use Case**: University IT administrators

#### 2. Professor/Instructor
- **Description**: Creates courses, manages resources, grades students
- **Use Case**: Teaching faculty

#### 3. Researcher
- **Description**: Publishes research papers, manages datasets, collaborates
- **Use Case**: Academic researchers and PhD candidates

#### 4. Student
- **Description**: Accesses course materials, submits assignments, views grades
- **Use Case**: Enrolled students

#### 5. Librarian
- **Description**: Organizes resources, manages cataloging, assists users
- **Use Case**: Academic librarians curating content

#### 6. Guest
- **Description**: Limited access to public resources and course catalogs
- **Use Case**: Prospective students and external visitors

### Permissions

**Course Management**
- `course:view` - View course information
- `course:create` - Create new courses
- `course:edit` - Modify course content
- `course:delete` - Remove courses
- `course:enroll` - Enroll in courses

**Resource Management**
- `resource:view` - View academic resources
- `resource:upload` - Upload documents, papers, datasets
- `resource:edit` - Modify resource metadata
- `resource:delete` - Remove resources
- `resource:download` - Download materials

**Research & Publication**
- `research:publish` - Publish research papers
- `research:review` - Peer review submissions
- `research:collaborate` - Collaborate on research
- `dataset:manage` - Upload and manage research data

**Assignment & Grading**
- `assignment:create` - Create assignments
- `assignment:submit` - Submit student work
- `assignment:grade` - Grade submissions
- `grade:view` - View grades

**Library Management**
- `library:organize` - Organize and categorize resources
- `library:catalog` - Add metadata and tags
- `citation:manage` - Manage citations and references

**User Management**
- `user:view` - View user directory
- `user:manage` - Add/remove users
- `enrollment:manage` - Manage course enrollments

### Permission Mapping

| Permission | Administrator | Professor | Researcher | Student | Librarian | Guest |
|-----------|--------------|-----------|-----------|---------|-----------|-------|
| course:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (public only) |
| course:create/edit | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| course:enroll | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| resource:view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (public only) |
| resource:upload | ✓ | ✓ | ✓ | ✓ (assignments) | ✓ | ✗ |
| resource:download | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| research:publish | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| research:review | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| assignment:create | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| assignment:submit | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| assignment:grade | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| grade:view | ✓ | ✓ (own courses) | ✗ | ✓ (own only) | ✗ | ✗ |
| library:* (all) | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ |
| user:* (all) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| enrollment:manage | ✓ | ✓ (own courses) | ✗ | ✗ | ✗ | ✗ |

---

## RBAC Model 8: Authentication Hub Platform
**Applies to:** AuthHub (System Service)

### Description
RBAC model for the AuthHub platform itself, managing authentication services, user accounts, and RBAC configurations.

### Roles

#### 1. Super Admin
- **Description**: Full platform control including service management and system settings
- **Use Case**: Platform owners and core team

#### 2. Service Admin
- **Description**: Manages services, login configurations, and RBAC models
- **Use Case**: Service managers configuring authentication

#### 3. User Manager
- **Description**: Manages user accounts, roles, and service assignments
- **Use Case**: HR/Admin staff managing user access

#### 4. Auditor
- **Description**: Read-only access to audit logs and compliance reports
- **Use Case**: Security and compliance teams

#### 5. API Developer
- **Description**: Manages API keys, integrations, and documentation
- **Use Case**: Developers integrating with AuthHub

### Permissions

**Service Management**
- `service:view` - View all services
- `service:create` - Create new services
- `service:edit` - Modify service configuration
- `service:delete` - Remove services

**User Management**
- `user:view` - View all users
- `user:create` - Create new users
- `user:edit` - Modify user details
- `user:delete` - Remove users
- `user:assign` - Assign users to service roles

**RBAC Configuration**
- `rbac:view` - View RBAC models
- `rbac:create` - Create RBAC models
- `rbac:edit` - Modify RBAC models
- `rbac:delete` - Remove RBAC models
- `role:assign` - Assign roles to users

**Login Configuration**
- `login:view` - View login configurations
- `login:create` - Create login pages
- `login:edit` - Modify login configurations
- `login:delete` - Remove login configs

**API Management**
- `api:view` - View API configurations
- `api:keys` - Manage API keys
- `api:docs` - Access API documentation

**Audit & Security**
- `audit:view` - View audit logs
- `audit:export` - Export audit reports
- `security:settings` - Configure security settings

### Permission Mapping

| Permission | Super Admin | Service Admin | User Manager | Auditor | API Developer |
|-----------|------------|--------------|-------------|---------|--------------|
| service:* (all) | ✓ | ✓ | ✗ | ✗ | ✗ |
| user:view | ✓ | ✓ | ✓ | ✓ | ✗ |
| user:create/edit/delete | ✓ | ✗ | ✓ | ✗ | ✗ |
| user:assign | ✓ | ✓ | ✓ | ✗ | ✗ |
| rbac:* (all) | ✓ | ✓ | ✗ | ✗ | ✗ |
| role:assign | ✓ | ✓ | ✓ | ✗ | ✗ |
| login:* (all) | ✓ | ✓ | ✗ | ✗ | ✗ |
| api:view | ✓ | ✓ | ✗ | ✗ | ✓ |
| api:keys | ✓ | ✗ | ✗ | ✗ | ✓ |
| api:docs | ✓ | ✓ | ✗ | ✗ | ✓ |
| audit:* (all) | ✓ | ✗ | ✗ | ✓ | ✗ |
| security:settings | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## Implementation Notes

### Seeding Strategy
1. **Order**: Models will be seeded in the order listed above
2. **IDs**: Use deterministic UUIDs for reproducibility across environments
3. **Relationships**: 
   - Each model will have its roles created immediately after model creation
   - Permissions will be created next
   - Role-permission mappings will be established last

### Service-Model Assignment
- Models will NOT be automatically assigned to services during seeding
- Administrators can manually assign RBAC models to services via the admin interface
- Suggested default assignments:
  - Git Garden → Model 1 (Git-Based Portfolio Platform)
  - Iron Path → Model 2 (Fitness & Wellness Platform)
  - PurpleGreen → Model 3 (Wealth Management Platform)
  - BTCPay Dashboard → Model 4 (Payment Processing Platform)
  - Quest Armory → Model 5 (Gamification Platform)
  - Git Healthz → Model 6 (Monitoring Platform)
  - Academia Vault → Model 7 (Academic Knowledge Management)
  - AuthHub → Model 8 (Authentication Hub Platform)

### Permission Naming Conventions
- Format: `resource:action`
- Resources: Plural nouns (e.g., `users`, `services`)
- Actions: Common verbs (`view`, `create`, `edit`, `delete`, `manage`)
- Wildcard support: `*` represents all actions for a resource

### Role Hierarchy Consideration
While not enforced in the database schema, roles within each model follow implicit hierarchies where higher-privileged roles inherit capabilities of lower ones. This is implemented through explicit permission assignments rather than inheritance.

---

## Migration from Current Models

The existing three generic models (CMS, Analytics, E-Commerce) will be replaced with these 8 service-specific models. Migration steps:

1. ✅ Remove existing RBAC models seeding code
2. ✅ Implement new 8 models with service-aligned permissions
3. ✅ Update seed function to create all 8 models
4. ✅ Test permission mappings for each role
5. ✅ Verify service-model assignments work correctly

---

## Future Enhancements

1. **Dynamic Permission Discovery**: Allow services to register custom permissions via API
2. **Role Templates**: Pre-configured role templates for common use cases
3. **Permission Groups**: Logical grouping of related permissions for easier management
4. **Conditional Permissions**: Context-aware permissions based on resource ownership or time-based constraints
5. **Multi-Model Support**: Allow services to use multiple RBAC models simultaneously

---

## Review Checklist

- [ ] Each service has a corresponding RBAC model
- [ ] Roles reflect realistic user types for each service
- [ ] Permissions follow consistent naming conventions
- [ ] Permission mappings create clear role hierarchies
- [ ] Models are comprehensive but not overly complex
- [ ] Security-sensitive permissions are properly restricted
- [ ] Documentation is clear for implementation team

---

**Document Version**: 1.0  
**Last Updated**: October 27, 2025  
**Status**: Ready for Review
