// Database storage implementation following javascript_database blueprint
import { users, apiKeys, services, globalServices, rbacModels, roles, permissions, rolePermissions, serviceRbacModels, userServiceRoles, authMethods, loginPageConfig, serviceAuthMethods, type User, type InsertUser, type ApiKey, type InsertApiKey, type Service, type InsertService, type GlobalService, type InsertGlobalService, type RbacModel, type InsertRbacModel, type Role, type InsertRole, type Permission, type InsertPermission, type RolePermission, type UserServiceRole, type AuthMethod, type LoginPageConfig, type ServiceAuthMethod, type InsertLoginPageConfig, type InsertServiceAuthMethod } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, isNull, asc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { strategyRegistry, placeholderMethods } from "./auth/StrategyRegistry";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAnonymousUser(role?: "admin" | "user"): Promise<User>;
  createUserWithUuid(uuid: string, role?: "admin" | "user"): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAdminCount(): Promise<number>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;

  // Service operations
  createService(service: InsertService & { secret?: string; secretPreview?: string; userId: string }): Promise<Service>;
  getService(id: string, userId: string): Promise<Service | undefined>;
  getServiceById(id: string): Promise<Service | undefined>; // Get service by ID (for JWT signing and verification)
  getAllServicesByUser(userId: string): Promise<Service[]>;
  updateService(id: string, userId: string, service: Partial<Service>): Promise<Service>;
  deleteService(id: string, userId: string): Promise<void>;

  // Global Service operations (admin-managed, no userId)
  createGlobalService(service: InsertGlobalService & { secret?: string; secretPreview?: string }): Promise<GlobalService>;
  getGlobalService(id: string): Promise<GlobalService | undefined>;
  getAllGlobalServices(): Promise<GlobalService[]>;
  updateGlobalService(id: string, service: Partial<GlobalService>): Promise<GlobalService>;
  deleteGlobalService(id: string): Promise<void>;

  // RBAC Model operations
  createRbacModel(model: InsertRbacModel & { createdBy: string }): Promise<RbacModel>;
  getRbacModel(id: string): Promise<RbacModel | undefined>;
  getAllRbacModels(): Promise<RbacModel[]>;
  updateRbacModel(id: string, updates: Partial<RbacModel>): Promise<RbacModel>;
  deleteRbacModel(id: string): Promise<void>;

  // Role operations
  createRole(role: InsertRole & { rbacModelId: string }): Promise<Role>;
  getRole(id: string): Promise<Role | undefined>;
  getRolesByModel(rbacModelId: string): Promise<Role[]>;
  updateRole(id: string, updates: Partial<Role>): Promise<Role>;
  deleteRole(id: string): Promise<void>;

  // Permission operations
  createPermission(permission: InsertPermission & { rbacModelId: string }): Promise<Permission>;
  getPermission(id: string): Promise<Permission | undefined>;
  getPermissionsByModel(rbacModelId: string): Promise<Permission[]>;
  updatePermission(id: string, updates: Partial<Permission>): Promise<Permission>;
  deletePermission(id: string): Promise<void>;

  // Role-Permission operations
  assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  getPermissionsForRole(roleId: string): Promise<Permission[]>;
  setRolePermissions(roleId: string, permissionIds: string[]): Promise<void>;
  getRolePermissionMappingsForModel(rbacModelId: string): Promise<Array<{ roleId: string; permissions: Permission[] }>>;

  // RBAC Seeding
  seedDefaultRbacModels(userId: string): Promise<void>;
  getRbacModelCount(): Promise<number>;

  // Service-RBAC Model Assignment operations
  assignRbacModelToService(serviceId: string, rbacModelId: string): Promise<void>;
  removeRbacModelFromService(serviceId: string): Promise<void>;
  getRbacModelForService(serviceId: string): Promise<RbacModel | undefined>;
  getServicesForRbacModel(rbacModelId: string): Promise<Service[]>;

  // User-Service-Role Assignment operations
  assignUserToServiceRole(userId: string, serviceId: string, roleId: string): Promise<UserServiceRole>;
  removeUserFromServiceRole(assignmentId: string): Promise<void>;
  getUserServiceRoles(userId: string): Promise<UserServiceRole[]>;
  getServiceUserRoles(serviceId: string): Promise<UserServiceRole[]>;
  getRoleUserAssignments(roleId: string): Promise<UserServiceRole[]>;
  getAllUserServiceRoles(): Promise<UserServiceRole[]>;
  getUserPermissionsForService(userId: string, serviceId: string): Promise<{
    role: { id: string; name: string; description: string | null } | null;
    permissions: Array<{ id: string; name: string; description: string | null }>;
    rbacModel: { id: string; name: string; description: string | null } | null;
  }>;

  // Login Page Configuration operations
  syncAuthMethodsFromRegistry(): Promise<void>;
  seedDefaultLoginPageConfig(): Promise<LoginPageConfig>;
  seedLoginPageConfigForService(serviceId: string): Promise<LoginPageConfig>;
  getEnabledServiceAuthMethods(loginConfigId: string): Promise<any[]>;
  getServiceAuthMethods(loginConfigId: string): Promise<any[]>;
  getDefaultLoginPageConfig(): Promise<LoginPageConfig | undefined>;
  getLoginPageConfigByServiceId(serviceId: string): Promise<LoginPageConfig | undefined>;
  getLoginPageConfigById(id: string): Promise<LoginPageConfig | undefined>;
  getAllLoginPageConfigs(): Promise<LoginPageConfig[]>;
  createLoginPageConfig(config: InsertLoginPageConfig): Promise<LoginPageConfig>;
  updateLoginPageConfig(id: string, data: Partial<LoginPageConfig>): Promise<LoginPageConfig>;
  deleteLoginPageConfig(id: string): Promise<void>;
  updateServiceAuthMethod(id: string, data: Partial<ServiceAuthMethod>): Promise<ServiceAuthMethod>;
  updateServiceAuthMethodsOrder(updates: Array<{ id: string; displayOrder: number }>): Promise<void>;
  getAllAuthMethods(): Promise<AuthMethod[]>;
  createServiceAuthMethods(data: InsertServiceAuthMethod[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserCount(): Promise<number> {
    const allUsers = await db.select().from(users);
    return allUsers.length;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAdminCount(): Promise<number> {
    const allUsers = await db.select().from(users);
    const adminUsers = allUsers.filter(user => user.role === 'admin');
    return adminUsers.length;
  }

  async createAnonymousUser(role?: "admin" | "user"): Promise<User> {
    // Create anonymous user with auto-generated UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({ role: role || "user" })
      .returning();
    return user;
  }

  async createUserWithUuid(uuid: string, role?: "admin" | "user"): Promise<User> {
    // Create user with specific UUID, no email/password
    const [user] = await db
      .insert(users)
      .values({ id: uuid, role: role || "user" })
      .returning();
    return user;
  }

  // API Key operations
  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    // Generate a secure random API key
    const key = `sk_${randomBytes(32).toString('hex')}`;
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({ ...insertApiKey, key })
      .returning();
    return apiKey;
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const [apiKey] = await db.select().from(apiKeys).where(eq(apiKeys.key, key));
    return apiKey || undefined;
  }

  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  // Service operations
  async createService(insertService: InsertService & { secret?: string; secretPreview?: string; userId: string }): Promise<Service> {
    const [service] = await db
      .insert(services)
      .values(insertService)
      .returning();
    return service;
  }

  async getService(id: string, userId: string): Promise<Service | undefined> {
    const [service] = await db
      .select()
      .from(services)
      .where(and(eq(services.id, id), eq(services.userId, userId)));
    return service || undefined;
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    // Get service by ID only, without userId filtering
    // Used for widget authentication where the secret itself proves authorization
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getAllServicesByUser(userId: string): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.userId, userId));
  }

  async updateService(id: string, userId: string, updateData: Partial<Service>): Promise<Service> {
    const [service] = await db
      .update(services)
      .set(updateData)
      .where(and(eq(services.id, id), eq(services.userId, userId)))
      .returning();
    return service;
  }

  async deleteService(id: string, userId: string): Promise<void> {
    await db.delete(services).where(and(eq(services.id, id), eq(services.userId, userId)));
  }

  // Global Service operations (admin-managed, no userId)
  async createGlobalService(insertService: InsertGlobalService & { secret?: string; secretPreview?: string }): Promise<GlobalService> {
    const [service] = await db
      .insert(globalServices)
      .values(insertService)
      .returning();
    return service;
  }

  async getGlobalService(id: string): Promise<GlobalService | undefined> {
    const [service] = await db
      .select()
      .from(globalServices)
      .where(eq(globalServices.id, id));
    return service || undefined;
  }

  async getAllGlobalServices(): Promise<GlobalService[]> {
    return await db.select().from(globalServices);
  }

  async updateGlobalService(id: string, updateData: Partial<GlobalService>): Promise<GlobalService> {
    const [service] = await db
      .update(globalServices)
      .set(updateData)
      .where(eq(globalServices.id, id))
      .returning();
    return service;
  }

  async deleteGlobalService(id: string): Promise<void> {
    await db.delete(globalServices).where(eq(globalServices.id, id));
  }

  // RBAC Model operations
  async createRbacModel(insertModel: InsertRbacModel & { createdBy: string }): Promise<RbacModel> {
    const [model] = await db
      .insert(rbacModels)
      .values(insertModel)
      .returning();
    return model;
  }

  async getRbacModel(id: string): Promise<RbacModel | undefined> {
    const [model] = await db
      .select()
      .from(rbacModels)
      .where(eq(rbacModels.id, id));
    return model || undefined;
  }

  async getAllRbacModels(): Promise<RbacModel[]> {
    return await db.select().from(rbacModels);
  }

  async updateRbacModel(id: string, updates: Partial<RbacModel>): Promise<RbacModel> {
    const [model] = await db
      .update(rbacModels)
      .set(updates)
      .where(eq(rbacModels.id, id))
      .returning();
    return model;
  }

  async deleteRbacModel(id: string): Promise<void> {
    await db.delete(rbacModels).where(eq(rbacModels.id, id));
  }

  // Role operations
  async createRole(insertRole: InsertRole & { rbacModelId: string }): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(insertRole)
      .returning();
    return role;
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, id));
    return role || undefined;
  }

  async getRolesByModel(rbacModelId: string): Promise<Role[]> {
    return await db
      .select()
      .from(roles)
      .where(eq(roles.rbacModelId, rbacModelId));
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const [role] = await db
      .update(roles)
      .set(updates)
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Permission operations
  async createPermission(insertPermission: InsertPermission & { rbacModelId: string }): Promise<Permission> {
    const [permission] = await db
      .insert(permissions)
      .values(insertPermission)
      .returning();
    return permission;
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, id));
    return permission || undefined;
  }

  async getPermissionsByModel(rbacModelId: string): Promise<Permission[]> {
    return await db
      .select()
      .from(permissions)
      .where(eq(permissions.rbacModelId, rbacModelId));
  }

  async updatePermission(id: string, updates: Partial<Permission>): Promise<Permission> {
    const [permission] = await db
      .update(permissions)
      .set(updates)
      .where(eq(permissions.id, id))
      .returning();
    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  // Role-Permission operations
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await db
      .insert(rolePermissions)
      .values({ roleId, permissionId })
      .onConflictDoNothing();
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    const rolePerms = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));
    
    if (rolePerms.length === 0) {
      return [];
    }

    const permissionIds = rolePerms.map(rp => rp.permissionId);
    return await db
      .select()
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));
  }

  async setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // Delete all existing permissions for this role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    
    // Add new permissions
    if (permissionIds.length > 0) {
      await db
        .insert(rolePermissions)
        .values(permissionIds.map(permissionId => ({ roleId, permissionId })));
    }
  }

  async getRolePermissionMappingsForModel(rbacModelId: string): Promise<Array<{ roleId: string; permissions: Permission[] }>> {
    // Get all roles for this model
    const modelRoles = await this.getRolesByModel(rbacModelId);
    
    // For each role, get its permissions
    const mappings = await Promise.all(
      modelRoles.map(async (role) => ({
        roleId: role.id,
        permissions: await this.getPermissionsForRole(role.id),
      }))
    );
    
    return mappings;
  }

  // RBAC Seeding operations
  async getRbacModelCount(): Promise<number> {
    const allModels = await db.select().from(rbacModels);
    return allModels.length;
  }

  async seedDefaultRbacModels(userId: string): Promise<void> {
    // Check if models already exist
    const modelCount = await this.getRbacModelCount();
    if (modelCount > 0) {
      return; // Already seeded
    }

    // Seed Model 1: Content Management System (Enhanced)
    const cmsModel = await this.createRbacModel({
      name: "Content Management System",
      description: "Comprehensive RBAC model for CMS platforms with granular content, media, user, and settings management",
      createdBy: userId,
    });

    // Create roles for CMS
    const ownerRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Owner",
      description: "Full administrative access including user management, system settings, and all content operations",
    });

    const adminRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Administrator",
      description: "Can manage content, media, and basic settings but cannot modify user roles or critical system settings",
    });

    const editorRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Editor",
      description: "Can create, edit, publish, and delete own content; can review and edit others' content",
    });

    const authorRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Author",
      description: "Can create and edit own content, submit for review, but cannot publish or delete",
    });

    const contributorRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Contributor",
      description: "Can create draft content only, must submit to editors for review and publishing",
    });

    const viewerRole = await this.createRole({
      rbacModelId: cmsModel.id,
      name: "Viewer",
      description: "Read-only access to published content",
    });

    // Create comprehensive permissions for CMS
    const cmsPerms = {
      // Content permissions
      contentCreate: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:create", description: "Create new content" }),
      contentRead: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:read", description: "View all content" }),
      contentUpdate: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:update", description: "Edit any content" }),
      contentDelete: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:delete", description: "Delete any content" }),
      contentPublish: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:publish", description: "Publish content live" }),
      contentUnpublish: await this.createPermission({ rbacModelId: cmsModel.id, name: "content:unpublish", description: "Remove content from publication" }),
      
      // Media permissions
      mediaUpload: await this.createPermission({ rbacModelId: cmsModel.id, name: "media:upload", description: "Upload images, videos, files" }),
      mediaDelete: await this.createPermission({ rbacModelId: cmsModel.id, name: "media:delete", description: "Delete media files" }),
      
      // User management
      usersView: await this.createPermission({ rbacModelId: cmsModel.id, name: "users:view", description: "View user list and profiles" }),
      usersManage: await this.createPermission({ rbacModelId: cmsModel.id, name: "users:manage", description: "Create, edit, and delete users" }),
      rolesManage: await this.createPermission({ rbacModelId: cmsModel.id, name: "roles:manage", description: "Assign and modify user roles" }),
      
      // Settings
      settingsView: await this.createPermission({ rbacModelId: cmsModel.id, name: "settings:view", description: "View system settings" }),
      settingsEdit: await this.createPermission({ rbacModelId: cmsModel.id, name: "settings:edit", description: "Modify system configuration" }),
      
      // Comments
      commentsModerate: await this.createPermission({ rbacModelId: cmsModel.id, name: "comments:moderate", description: "Approve, edit, or delete comments" }),
    };

    // Assign permissions to roles with realistic hierarchies
    await this.setRolePermissions(ownerRole.id, Object.values(cmsPerms).map(p => p.id));
    
    await this.setRolePermissions(adminRole.id, [
      cmsPerms.contentCreate.id, cmsPerms.contentRead.id, cmsPerms.contentUpdate.id, 
      cmsPerms.contentDelete.id, cmsPerms.contentPublish.id, cmsPerms.contentUnpublish.id,
      cmsPerms.mediaUpload.id, cmsPerms.mediaDelete.id,
      cmsPerms.usersView.id, cmsPerms.settingsView.id, cmsPerms.settingsEdit.id,
      cmsPerms.commentsModerate.id
    ]);
    
    await this.setRolePermissions(editorRole.id, [
      cmsPerms.contentCreate.id, cmsPerms.contentRead.id, cmsPerms.contentUpdate.id,
      cmsPerms.contentDelete.id, cmsPerms.contentPublish.id, cmsPerms.contentUnpublish.id,
      cmsPerms.mediaUpload.id, cmsPerms.commentsModerate.id
    ]);
    
    await this.setRolePermissions(authorRole.id, [
      cmsPerms.contentCreate.id, cmsPerms.contentRead.id, cmsPerms.contentUpdate.id,
      cmsPerms.mediaUpload.id
    ]);
    
    await this.setRolePermissions(contributorRole.id, [
      cmsPerms.contentCreate.id, cmsPerms.contentRead.id, cmsPerms.mediaUpload.id
    ]);
    
    await this.setRolePermissions(viewerRole.id, [cmsPerms.contentRead.id]);

    // Seed Model 2: Analytics Platform (Enhanced)
    const analyticsModel = await this.createRbacModel({
      name: "Analytics Platform",
      description: "Enterprise analytics RBAC model with dashboards, reports, data sources, alerts, and collaboration features",
      createdBy: userId,
    });

    // Create roles for Analytics
    const analyticsAdminRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Analytics Administrator",
      description: "Full control over analytics platform, data sources, users, and system configuration",
    });

    const dataEngineerRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Data Engineer",
      description: "Can manage data sources, create datasets, and configure data pipelines",
    });

    const seniorAnalystRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Senior Analyst",
      description: "Can create and edit dashboards, reports, alerts, and share with teams",
    });

    const analystRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Analyst",
      description: "Can view all dashboards, create personal reports, and export data",
    });

    const businessUserRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Business User",
      description: "Can view shared dashboards and reports, limited export capabilities",
    });

    const analyticsViewerRole = await this.createRole({
      rbacModelId: analyticsModel.id,
      name: "Viewer",
      description: "Read-only access to assigned dashboards",
    });

    // Create comprehensive permissions for Analytics
    const analyticsPerms = {
      // Dashboard permissions
      dashboardView: await this.createPermission({ rbacModelId: analyticsModel.id, name: "dashboard:view", description: "View dashboards" }),
      dashboardCreate: await this.createPermission({ rbacModelId: analyticsModel.id, name: "dashboard:create", description: "Create new dashboards" }),
      dashboardEdit: await this.createPermission({ rbacModelId: analyticsModel.id, name: "dashboard:edit", description: "Edit dashboards" }),
      dashboardDelete: await this.createPermission({ rbacModelId: analyticsModel.id, name: "dashboard:delete", description: "Delete dashboards" }),
      dashboardShare: await this.createPermission({ rbacModelId: analyticsModel.id, name: "dashboard:share", description: "Share dashboards with others" }),
      
      // Report permissions
      reportView: await this.createPermission({ rbacModelId: analyticsModel.id, name: "report:view", description: "View reports" }),
      reportCreate: await this.createPermission({ rbacModelId: analyticsModel.id, name: "report:create", description: "Create custom reports" }),
      reportSchedule: await this.createPermission({ rbacModelId: analyticsModel.id, name: "report:schedule", description: "Schedule automated reports" }),
      
      // Data permissions
      dataExport: await this.createPermission({ rbacModelId: analyticsModel.id, name: "data:export", description: "Export data to CSV/Excel" }),
      dataSourceView: await this.createPermission({ rbacModelId: analyticsModel.id, name: "datasource:view", description: "View data source configurations" }),
      dataSourceManage: await this.createPermission({ rbacModelId: analyticsModel.id, name: "datasource:manage", description: "Create and modify data sources" }),
      
      // Alert permissions
      alertView: await this.createPermission({ rbacModelId: analyticsModel.id, name: "alert:view", description: "View alert configurations" }),
      alertCreate: await this.createPermission({ rbacModelId: analyticsModel.id, name: "alert:create", description: "Create and configure alerts" }),
      
      // Admin permissions
      usersManage: await this.createPermission({ rbacModelId: analyticsModel.id, name: "users:manage", description: "Manage platform users" }),
      settingsManage: await this.createPermission({ rbacModelId: analyticsModel.id, name: "settings:manage", description: "Configure platform settings" }),
    };

    // Assign permissions to roles
    await this.setRolePermissions(analyticsAdminRole.id, Object.values(analyticsPerms).map(p => p.id));
    
    await this.setRolePermissions(dataEngineerRole.id, [
      analyticsPerms.dashboardView.id, analyticsPerms.reportView.id,
      analyticsPerms.dataSourceView.id, analyticsPerms.dataSourceManage.id,
      analyticsPerms.dataExport.id
    ]);
    
    await this.setRolePermissions(seniorAnalystRole.id, [
      analyticsPerms.dashboardView.id, analyticsPerms.dashboardCreate.id,
      analyticsPerms.dashboardEdit.id, analyticsPerms.dashboardDelete.id, analyticsPerms.dashboardShare.id,
      analyticsPerms.reportView.id, analyticsPerms.reportCreate.id, analyticsPerms.reportSchedule.id,
      analyticsPerms.alertView.id, analyticsPerms.alertCreate.id,
      analyticsPerms.dataExport.id
    ]);
    
    await this.setRolePermissions(analystRole.id, [
      analyticsPerms.dashboardView.id, analyticsPerms.dashboardCreate.id,
      analyticsPerms.reportView.id, analyticsPerms.reportCreate.id,
      analyticsPerms.alertView.id, analyticsPerms.dataExport.id
    ]);
    
    await this.setRolePermissions(businessUserRole.id, [
      analyticsPerms.dashboardView.id, analyticsPerms.reportView.id,
      analyticsPerms.dataExport.id
    ]);
    
    await this.setRolePermissions(analyticsViewerRole.id, [
      analyticsPerms.dashboardView.id, analyticsPerms.reportView.id
    ]);

    // Seed Model 3: E-Commerce Platform (Enhanced)
    const ecommerceModel = await this.createRbacModel({
      name: "E-Commerce Platform",
      description: "Complete e-commerce RBAC model covering products, orders, customers, inventory, marketing, and financial operations",
      createdBy: userId,
    });

    // Create roles for E-Commerce
    const ecomAdminRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Platform Administrator",
      description: "Full administrative access to all platform features, settings, and financial data",
    });

    const storeManagerRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Store Manager",
      description: "Manages products, inventory, orders, and customer service but no access to financial settings",
    });

    const inventoryManagerRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Inventory Manager",
      description: "Manages stock levels, suppliers, warehouses, and fulfillment operations",
    });

    const marketingManagerRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Marketing Manager",
      description: "Manages promotions, discounts, campaigns, and customer communications",
    });

    const customerServiceRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Customer Service",
      description: "Handles customer inquiries, processes returns, and manages order issues",
    });

    const salesStaffRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Sales Staff",
      description: "Can view products, create orders, and access customer information",
    });

    const customerRole = await this.createRole({
      rbacModelId: ecommerceModel.id,
      name: "Customer",
      description: "Standard shopping experience with order tracking and account management",
    });

    // Create comprehensive permissions for E-Commerce
    const ecomPerms = {
      // Product permissions
      productView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "product:view", description: "View product catalog" }),
      productCreate: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "product:create", description: "Add new products" }),
      productEdit: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "product:edit", description: "Edit product details" }),
      productDelete: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "product:delete", description: "Remove products" }),
      productPublish: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "product:publish", description: "Publish/unpublish products" }),
      
      // Inventory permissions
      inventoryView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "inventory:view", description: "View stock levels" }),
      inventoryUpdate: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "inventory:update", description: "Adjust inventory quantities" }),
      supplierManage: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "supplier:manage", description: "Manage suppliers and purchase orders" }),
      
      // Order permissions
      orderView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "order:view", description: "View customer orders" }),
      orderCreate: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "order:create", description: "Create new orders" }),
      orderUpdate: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "order:update", description: "Update order status" }),
      orderCancel: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "order:cancel", description: "Cancel orders" }),
      orderRefund: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "order:refund", description: "Process refunds" }),
      
      // Customer permissions
      customerView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "customer:view", description: "View customer information" }),
      customerEdit: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "customer:edit", description: "Edit customer details" }),
      
      // Marketing permissions
      discountCreate: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "discount:create", description: "Create discount codes and promotions" }),
      campaignManage: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "campaign:manage", description: "Manage marketing campaigns" }),
      
      // Analytics & Reporting
      analyticsView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "analytics:view", description: "View sales and performance analytics" }),
      reportExport: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "report:export", description: "Export reports and data" }),
      
      // Settings permissions
      settingsView: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "settings:view", description: "View platform settings" }),
      settingsEdit: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "settings:edit", description: "Modify platform configuration" }),
      paymentSettings: await this.createPermission({ rbacModelId: ecommerceModel.id, name: "payment:settings", description: "Configure payment gateways" }),
    };

    // Assign permissions to roles
    await this.setRolePermissions(ecomAdminRole.id, Object.values(ecomPerms).map(p => p.id));
    
    await this.setRolePermissions(storeManagerRole.id, [
      ecomPerms.productView.id, ecomPerms.productCreate.id, ecomPerms.productEdit.id, 
      ecomPerms.productDelete.id, ecomPerms.productPublish.id,
      ecomPerms.inventoryView.id, ecomPerms.inventoryUpdate.id,
      ecomPerms.orderView.id, ecomPerms.orderUpdate.id, ecomPerms.orderCancel.id, ecomPerms.orderRefund.id,
      ecomPerms.customerView.id, ecomPerms.customerEdit.id,
      ecomPerms.analyticsView.id, ecomPerms.reportExport.id,
      ecomPerms.settingsView.id
    ]);
    
    await this.setRolePermissions(inventoryManagerRole.id, [
      ecomPerms.productView.id,
      ecomPerms.inventoryView.id, ecomPerms.inventoryUpdate.id, ecomPerms.supplierManage.id,
      ecomPerms.orderView.id, ecomPerms.orderUpdate.id,
      ecomPerms.analyticsView.id
    ]);
    
    await this.setRolePermissions(marketingManagerRole.id, [
      ecomPerms.productView.id, ecomPerms.productEdit.id,
      ecomPerms.customerView.id,
      ecomPerms.discountCreate.id, ecomPerms.campaignManage.id,
      ecomPerms.analyticsView.id, ecomPerms.reportExport.id
    ]);
    
    await this.setRolePermissions(customerServiceRole.id, [
      ecomPerms.productView.id,
      ecomPerms.orderView.id, ecomPerms.orderUpdate.id, ecomPerms.orderCancel.id, ecomPerms.orderRefund.id,
      ecomPerms.customerView.id, ecomPerms.customerEdit.id
    ]);
    
    await this.setRolePermissions(salesStaffRole.id, [
      ecomPerms.productView.id,
      ecomPerms.orderView.id, ecomPerms.orderCreate.id,
      ecomPerms.customerView.id
    ]);
    
    await this.setRolePermissions(customerRole.id, [
      ecomPerms.productView.id, ecomPerms.orderView.id
    ]);

    console.log("✅ Successfully seeded 3 comprehensive RBAC models with realistic role hierarchies and permissions");
  }

  // Service-RBAC Model Assignment operations
  async assignRbacModelToService(serviceId: string, rbacModelId: string): Promise<void> {
    // First check if the service already has a model assigned
    const existing = await db
      .select()
      .from(serviceRbacModels)
      .where(eq(serviceRbacModels.serviceId, serviceId));

    if (existing.length > 0) {
      // Update the existing assignment
      await db
        .update(serviceRbacModels)
        .set({ rbacModelId })
        .where(eq(serviceRbacModels.serviceId, serviceId));
    } else {
      // Insert new assignment
      await db
        .insert(serviceRbacModels)
        .values({ serviceId, rbacModelId });
    }
  }

  async removeRbacModelFromService(serviceId: string): Promise<void> {
    await db
      .delete(serviceRbacModels)
      .where(eq(serviceRbacModels.serviceId, serviceId));
  }

  async getRbacModelForService(serviceId: string): Promise<RbacModel | undefined> {
    const [assignment] = await db
      .select({
        model: rbacModels
      })
      .from(serviceRbacModels)
      .innerJoin(rbacModels, eq(serviceRbacModels.rbacModelId, rbacModels.id))
      .where(eq(serviceRbacModels.serviceId, serviceId));

    return assignment?.model;
  }

  async getServicesForRbacModel(rbacModelId: string): Promise<Service[]> {
    const assignments = await db
      .select({
        service: services
      })
      .from(serviceRbacModels)
      .innerJoin(services, eq(serviceRbacModels.serviceId, services.id))
      .where(eq(serviceRbacModels.rbacModelId, rbacModelId));

    return assignments.map(a => a.service);
  }

  // User-Service-Role Assignment operations
  async assignUserToServiceRole(userId: string, serviceId: string, roleId: string): Promise<UserServiceRole> {
    const [assignment] = await db
      .insert(userServiceRoles)
      .values({ userId, serviceId, roleId })
      .returning();
    return assignment;
  }

  async removeUserFromServiceRole(assignmentId: string): Promise<void> {
    await db
      .delete(userServiceRoles)
      .where(eq(userServiceRoles.id, assignmentId));
  }

  async getUserServiceRoles(userId: string): Promise<UserServiceRole[]> {
    return await db
      .select()
      .from(userServiceRoles)
      .where(eq(userServiceRoles.userId, userId));
  }

  async getServiceUserRoles(serviceId: string): Promise<UserServiceRole[]> {
    return await db
      .select()
      .from(userServiceRoles)
      .where(eq(userServiceRoles.serviceId, serviceId));
  }

  async getRoleUserAssignments(roleId: string): Promise<UserServiceRole[]> {
    return await db
      .select()
      .from(userServiceRoles)
      .where(eq(userServiceRoles.roleId, roleId));
  }

  async getAllUserServiceRoles(): Promise<UserServiceRole[]> {
    return await db
      .select()
      .from(userServiceRoles);
  }

  async getUserPermissionsForService(userId: string, serviceId: string): Promise<{
    role: { id: string; name: string; description: string | null } | null;
    permissions: Array<{ id: string; name: string; description: string | null }>;
    rbacModel: { id: string; name: string; description: string | null } | null;
  }> {
    // Get RBAC model for the service
    const rbacModel = await this.getRbacModelForService(serviceId);
    
    if (!rbacModel) {
      // No RBAC model assigned to service
      return {
        role: null,
        permissions: [],
        rbacModel: null
      };
    }

    // Get user's role assignment for this service
    const userServiceRolesList = await db
      .select()
      .from(userServiceRoles)
      .where(
        and(
          eq(userServiceRoles.userId, userId),
          eq(userServiceRoles.serviceId, serviceId)
        )
      );

    if (userServiceRolesList.length === 0) {
      // User has no role assigned for this service
      return {
        role: null,
        permissions: [],
        rbacModel: {
          id: rbacModel.id,
          name: rbacModel.name,
          description: rbacModel.description
        }
      };
    }

    const userServiceRole = userServiceRolesList[0];
    
    // Get role details
    const role = await this.getRole(userServiceRole.roleId);
    
    if (!role) {
      // Role not found (shouldn't happen with FK constraints)
      return {
        role: null,
        permissions: [],
        rbacModel: {
          id: rbacModel.id,
          name: rbacModel.name,
          description: rbacModel.description
        }
      };
    }

    // Get permissions for the role
    const rolePermissions = await this.getPermissionsForRole(role.id);

    return {
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      permissions: rolePermissions.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description
      })),
      rbacModel: {
        id: rbacModel.id,
        name: rbacModel.name,
        description: rbacModel.description
      }
    };
  }

  // ==================== Login Page Configuration Operations ====================

  /**
   * Syncs auth_methods table with registered strategies + placeholders
   * Called on server startup to ensure database reflects all available methods
   */
  async syncAuthMethodsFromRegistry(): Promise<void> {
    const registeredStrategies = strategyRegistry.getAllMetadata();
    const allMethods = [...registeredStrategies, ...placeholderMethods];
    
    console.log(`[Storage] Syncing ${allMethods.length} auth methods (${registeredStrategies.length} implemented, ${placeholderMethods.length} placeholders)...`);
    
    for (const metadata of allMethods) {
      const isImplemented = strategyRegistry.isImplemented(metadata.id);
      
      await db.insert(authMethods)
        .values({
          id: metadata.id,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon,
          category: metadata.category,
          implemented: isImplemented,
          defaultButtonText: metadata.buttonText,
          defaultButtonVariant: metadata.buttonVariant,
          defaultHelpText: metadata.helpText,
        })
        .onConflictDoUpdate({
          target: authMethods.id,
          set: {
            name: metadata.name,
            description: metadata.description,
            icon: metadata.icon,
            category: metadata.category,
            implemented: isImplemented,
            defaultButtonText: metadata.buttonText,
            defaultButtonVariant: metadata.buttonVariant,
            defaultHelpText: metadata.helpText,
            updatedAt: new Date(),
          },
        });
      
      console.log(`[Storage] Synced: ${metadata.name} (${metadata.id}) - ${isImplemented ? 'IMPLEMENTED' : 'PLACEHOLDER'}`);
    }
  }

  /**
   * Seeds default login page configuration for AuthHub itself (serviceId is null)
   * This is used when users login to AuthHub dashboard (not OAuth redirect flow)
   */
  async seedDefaultLoginPageConfig(): Promise<LoginPageConfig> {
    // First, sync auth methods from strategy registry
    await this.syncAuthMethodsFromRegistry();
    
    // Check if default config already exists
    const existing = await this.getDefaultLoginPageConfig();
    if (existing) {
      return existing;
    }
    
    // Create default login page configuration (no serviceId)
    const implementedMethods = strategyRegistry.getImplementedIds();
    
    const [config] = await db.insert(loginPageConfig).values({
      serviceId: null, // null means this is for AuthHub itself
      title: "AuthHub",
      description: "Centralized Authentication System",
      defaultMethod: implementedMethods[0] || "uuid",
    }).returning();
    
    console.log(`[Storage] Created default login config for AuthHub`);
    
    // Seed service auth methods for this config
    const allAuthMethods = await db.select().from(authMethods);
    const serviceAuthMethodsData = allAuthMethods.map((method, index) => ({
      loginConfigId: config.id,
      authMethodId: method.id,
      enabled: true,
      showComingSoonBadge: !method.implemented,
      displayOrder: index,
    }));
    
    if (serviceAuthMethodsData.length > 0) {
      await db.insert(serviceAuthMethods).values(serviceAuthMethodsData);
      console.log(`[Storage] Created ${serviceAuthMethodsData.length} service auth methods for default config`);
    }
    
    return config;
  }

  /**
   * Seeds login page configuration for a specific service
   * Creates default configuration with all auth methods enabled
   */
  async seedLoginPageConfigForService(serviceId: string): Promise<LoginPageConfig> {
    // First, sync auth methods from strategy registry
    await this.syncAuthMethodsFromRegistry();
    
    // Check if config already exists for this service
    const existing = await this.getLoginPageConfigByServiceId(serviceId);
    if (existing) {
      return existing;
    }
    
    // Create login page configuration for this service
    const implementedMethods = strategyRegistry.getImplementedIds();
    
    const [config] = await db.insert(loginPageConfig).values({
      serviceId,
      title: "Welcome to AuthHub",
      description: "Choose your preferred authentication method",
      defaultMethod: implementedMethods[0] || "uuid",
    }).returning();
    
    console.log(`[Storage] Created login config for service ${serviceId}`);
    
    // Seed service auth methods for this config
    const allAuthMethods = await db.select().from(authMethods);
    const serviceAuthMethodsData = allAuthMethods.map((method, index) => ({
      loginConfigId: config.id,
      authMethodId: method.id,
      enabled: true,
      showComingSoonBadge: !method.implemented,
      displayOrder: index,
    }));
    
    if (serviceAuthMethodsData.length > 0) {
      await db.insert(serviceAuthMethods).values(serviceAuthMethodsData);
      console.log(`[Storage] Created ${serviceAuthMethodsData.length} service auth methods for service ${serviceId}`);
    }
    
    return config;
  }

  /**
   * Get enabled auth methods for a login config with enriched data from auth_methods table
   * Results are ordered by displayOrder ASC
   */
  async getEnabledServiceAuthMethods(loginConfigId: string): Promise<any[]> {
    const results = await db
      .select({
        id: serviceAuthMethods.id,
        loginConfigId: serviceAuthMethods.loginConfigId,
        authMethodId: serviceAuthMethods.authMethodId,
        enabled: serviceAuthMethods.enabled,
        showComingSoonBadge: serviceAuthMethods.showComingSoonBadge,
        buttonText: serviceAuthMethods.buttonText,
        buttonVariant: serviceAuthMethods.buttonVariant,
        helpText: serviceAuthMethods.helpText,
        displayOrder: serviceAuthMethods.displayOrder,
        
        name: authMethods.name,
        description: authMethods.description,
        icon: authMethods.icon,
        category: authMethods.category,
        implemented: authMethods.implemented,
        defaultButtonText: authMethods.defaultButtonText,
        defaultButtonVariant: authMethods.defaultButtonVariant,
        defaultHelpText: authMethods.defaultHelpText,
      })
      .from(serviceAuthMethods)
      .innerJoin(authMethods, eq(serviceAuthMethods.authMethodId, authMethods.id))
      .where(
        and(
          eq(serviceAuthMethods.loginConfigId, loginConfigId),
          eq(serviceAuthMethods.enabled, true)
        )
      )
      .orderBy(asc(serviceAuthMethods.displayOrder));
      
    return results;
  }

  /**
   * Get ALL auth methods for a login config (including disabled ones)
   * Used by admin login editor to show all methods with toggles
   */
  async getServiceAuthMethods(loginConfigId: string): Promise<any[]> {
    const results = await db
      .select({
        id: serviceAuthMethods.id,
        loginConfigId: serviceAuthMethods.loginConfigId,
        authMethodId: serviceAuthMethods.authMethodId,
        enabled: serviceAuthMethods.enabled,
        showComingSoonBadge: serviceAuthMethods.showComingSoonBadge,
        buttonText: serviceAuthMethods.buttonText,
        buttonVariant: serviceAuthMethods.buttonVariant,
        helpText: serviceAuthMethods.helpText,
        displayOrder: serviceAuthMethods.displayOrder,
        
        name: authMethods.name,
        description: authMethods.description,
        icon: authMethods.icon,
        category: authMethods.category,
        implemented: authMethods.implemented,
        defaultButtonText: authMethods.defaultButtonText,
        defaultButtonVariant: authMethods.defaultButtonVariant,
        defaultHelpText: authMethods.defaultHelpText,
      })
      .from(serviceAuthMethods)
      .innerJoin(authMethods, eq(serviceAuthMethods.authMethodId, authMethods.id))
      .where(eq(serviceAuthMethods.loginConfigId, loginConfigId))
      .orderBy(asc(serviceAuthMethods.displayOrder));
      
    return results;
  }

  async getDefaultLoginPageConfig(): Promise<LoginPageConfig | undefined> {
    const [config] = await db
      .select()
      .from(loginPageConfig)
      .where(sql`${loginPageConfig.serviceId} IS NULL`)
      .limit(1);
    return config || undefined;
  }

  async getLoginPageConfigByServiceId(serviceId: string): Promise<LoginPageConfig | undefined> {
    const [config] = await db
      .select()
      .from(loginPageConfig)
      .where(eq(loginPageConfig.serviceId, serviceId))
      .limit(1);
    return config || undefined;
  }

  async getAllLoginPageConfigs(): Promise<LoginPageConfig[]> {
    return await db.select().from(loginPageConfig);
  }

  async createLoginPageConfig(config: InsertLoginPageConfig): Promise<LoginPageConfig> {
    const [newConfig] = await db
      .insert(loginPageConfig)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateLoginPageConfig(id: string, data: Partial<LoginPageConfig>): Promise<LoginPageConfig> {
    const [updated] = await db
      .update(loginPageConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(loginPageConfig.id, id))
      .returning();
    return updated;
  }

  async updateServiceAuthMethod(id: string, data: Partial<ServiceAuthMethod>): Promise<ServiceAuthMethod> {
    const [updated] = await db
      .update(serviceAuthMethods)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceAuthMethods.id, id))
      .returning();
    return updated;
  }

  async updateServiceAuthMethodsOrder(updates: Array<{ id: string; displayOrder: number }>): Promise<void> {
    for (const update of updates) {
      await db
        .update(serviceAuthMethods)
        .set({ displayOrder: update.displayOrder, updatedAt: new Date() })
        .where(eq(serviceAuthMethods.id, update.id));
    }
  }

  async getLoginPageConfigById(id: string): Promise<LoginPageConfig | undefined> {
    const [config] = await db
      .select()
      .from(loginPageConfig)
      .where(eq(loginPageConfig.id, id))
      .limit(1);
    return config || undefined;
  }

  async deleteLoginPageConfig(id: string): Promise<void> {
    await db
      .delete(loginPageConfig)
      .where(eq(loginPageConfig.id, id));
  }

  async getAllAuthMethods(): Promise<AuthMethod[]> {
    return await db.select().from(authMethods);
  }

  async createServiceAuthMethods(data: InsertServiceAuthMethod[]): Promise<void> {
    if (data.length > 0) {
      await db.insert(serviceAuthMethods).values(data);
    }
  }
}

export const storage = new DatabaseStorage();
