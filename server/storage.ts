// Database storage implementation following javascript_database blueprint
import { users, apiKeys, services, rbacModels, roles, permissions, rolePermissions, serviceRbacModels, userServiceRoles, authMethods, loginPageConfig, serviceAuthMethods, type User, type InsertUser, type ApiKey, type InsertApiKey, type Service, type InsertService, type RbacModel, type InsertRbacModel, type Role, type InsertRole, type Permission, type InsertPermission, type RolePermission, type UserServiceRole, type AuthMethod, type LoginPageConfig, type ServiceAuthMethod, type InsertLoginPageConfig, type InsertServiceAuthMethod } from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, isNull, asc, sql, or } from "drizzle-orm";
import { randomBytes } from "crypto";
import { strategyRegistry, placeholderMethods } from "./auth/StrategyRegistry";
import { AUTHHUB_SERVICE, AUTHHUB_SERVICE_ID } from "@shared/constants";
import { encryptSecret } from "./crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createAnonymousUser(role?: "admin" | "user"): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getAdminCount(): Promise<number>;

  // API Key operations
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  getAllApiKeys(): Promise<ApiKey[]>;

  // Service operations (all services are global)
  createService(service: InsertService & { secret?: string; secretPreview?: string; userId?: string | null }): Promise<Service>;
  getService(id: string, userId: string): Promise<Service | undefined>;
  getServiceById(id: string): Promise<Service | undefined>; // Get service by ID (for JWT signing and verification)
  getAllServicesByUser(userId: string): Promise<Service[]>;
  getAllServices(userId: string): Promise<Service[]>; // Get all services (global + user-specific)
  updateService(id: string, updateData: Partial<Service>): Promise<Service>;
  deleteService(id: string): Promise<void>;

  // RBAC Model operations
  createRbacModel(model: InsertRbacModel & { createdBy?: string | null }): Promise<RbacModel>;
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
  seedDefaultRbacModels(): Promise<void>;
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

  // Seeding
  seedDefaultServices(): Promise<void>;

  // Login Page Configuration operations
  syncAuthMethodsFromRegistry(): Promise<void>;
  seedLoginPageConfigForService(serviceId: string): Promise<LoginPageConfig>;
  getEnabledServiceAuthMethods(loginConfigId: string): Promise<any[]>;
  getServiceAuthMethods(loginConfigId: string): Promise<any[]>;
  getLoginPageConfigByServiceId(serviceId: string): Promise<LoginPageConfig | undefined>;
  getLoginPageConfigById(id: string): Promise<LoginPageConfig | undefined>;
  getAllLoginPageConfigs(): Promise<LoginPageConfig[]>;
  createLoginPageConfig(config: InsertLoginPageConfig): Promise<LoginPageConfig>;
  updateLoginPageConfig(id: string, data: Partial<LoginPageConfig>): Promise<LoginPageConfig>;
  deleteLoginPageConfig(id: string): Promise<void>;
  assignLoginConfigToService(configId: string, serviceId: string | null): Promise<Service>;
  getLoginConfigForService(serviceId: string): Promise<LoginPageConfig | undefined>;
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
    // Count all users
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
    // Create anonymous user with auto-generated UUID4, no email/password
    // Database generates proper UUID4 values via gen_random_uuid()
    const [user] = await db
      .insert(users)
      .values({ role: role || "user" })
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

  async updateService(id: string, updateData: Partial<Service>): Promise<Service> {
    // All services are global - no userId filtering needed
    const [service] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: string): Promise<void> {
    // All services are global - no userId filtering needed
    await db.delete(services).where(eq(services.id, id));
  }

  async getAllServices(userId: string): Promise<Service[]> {
    return await db.select().from(services).where(
      or(
        isNull(services.userId),
        eq(services.userId, userId)
      )
    );
  }

  async seedDefaultServices(): Promise<void> {
    const { DEFAULT_SERVICES, generateServiceSecret } = await import("./seed");

    for (const serviceConfig of DEFAULT_SERVICES) {
      // For AuthHub, check by ID; for others, check by name
      const checkId = serviceConfig.name === AUTHHUB_SERVICE.name ? AUTHHUB_SERVICE_ID : null;
      
      let existing;
      if (checkId) {
        existing = await db.select().from(services).where(eq(services.id, checkId)).limit(1);
      } else {
        existing = await db
          .select()
          .from(services)
          .where(and(
            eq(services.name, serviceConfig.name),
            isNull(services.userId)
          ))
          .limit(1);
      }

      if (existing.length > 0) {
        console.log(`[Storage] Global service "${serviceConfig.name}" already exists, skipping...`);
        
        // Ensure AuthHub has a login config even if the service already exists
        if (serviceConfig.name === AUTHHUB_SERVICE.name) {
          const existingConfig = await this.getLoginPageConfigByServiceId(AUTHHUB_SERVICE_ID);
          if (!existingConfig) {
            console.log(`[Storage] AuthHub exists but has no login config, seeding...`);
            await this.seedLoginPageConfigForService(AUTHHUB_SERVICE_ID);
          }
        }
        continue;
      }

      const { encryptedSecret, secretPreview, secret } = generateServiceSecret();

      await db.insert(services).values({
        id: checkId || undefined,
        name: serviceConfig.name,
        description: serviceConfig.description,
        url: serviceConfig.url,
        icon: serviceConfig.icon,
        color: serviceConfig.color,
        userId: null,
        secret: encryptedSecret,
        secretPreview,
        redirectUrl: serviceConfig.url,
        isSystem: serviceConfig.isSystem || false,
      });

      console.log(`[Storage] Created global service: ${serviceConfig.name}`);
      console.log(`   Secret: ${secret}`);

      if (serviceConfig.name === AUTHHUB_SERVICE.name) {
        await this.seedLoginPageConfigForService(AUTHHUB_SERVICE_ID);
      }
    }

    console.log("[Storage] Default services seeding completed");
  }

  // RBAC Model operations
  async createRbacModel(insertModel: InsertRbacModel & { createdBy?: string | null }): Promise<RbacModel> {
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

  async seedDefaultRbacModels(): Promise<void> {
    // Check if models already exist
    const modelCount = await this.getRbacModelCount();
    if (modelCount > 0) {
      return; // Already seeded
    }

    // ===== MODEL 1: Git-Based Portfolio Platform (Git Garden) =====
    const gitPortfolioModel = await this.createRbacModel({
      name: "Git-Based Portfolio Platform",
      description: "RBAC model for Git-based portfolio and project showcase platforms where users manage repositories, projects, and public profiles",
      createdBy: null,
    });

    // Roles
    const portfolioOwner = await this.createRole({
      rbacModelId: gitPortfolioModel.id,
      name: "Portfolio Owner",
      description: "Full control over their portfolio, projects, settings, and integrations",
    });

    const collaborator = await this.createRole({
      rbacModelId: gitPortfolioModel.id,
      name: "Collaborator",
      description: "Can contribute to projects, edit content, but cannot manage critical settings",
    });

    const viewer = await this.createRole({
      rbacModelId: gitPortfolioModel.id,
      name: "Viewer",
      description: "Read-only access to public portfolios and projects",
    });

    // Permissions
    const gitPerms = {
      repositoryCreate: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "repository:create", description: "Create new repositories" }),
      repositoryRead: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "repository:read", description: "View repository details" }),
      repositoryUpdate: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "repository:update", description: "Edit repository information" }),
      repositoryDelete: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "repository:delete", description: "Remove repositories" }),
      repositorySync: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "repository:sync", description: "Sync with Git providers" }),
      projectCreate: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "project:create", description: "Create new projects" }),
      projectRead: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "project:read", description: "View projects" }),
      projectUpdate: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "project:update", description: "Edit project details" }),
      projectDelete: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "project:delete", description: "Remove projects" }),
      projectPublish: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "project:publish", description: "Make projects publicly visible" }),
      profileView: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "profile:view", description: "View profile information" }),
      profileEdit: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "profile:edit", description: "Edit personal profile" }),
      profileCustomize: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "profile:customize", description: "Customize portfolio theme/layout" }),
      integrationConnect: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "integration:connect", description: "Connect to GitHub/GitLab" }),
      integrationDisconnect: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "integration:disconnect", description: "Remove Git integrations" }),
      integrationView: await this.createPermission({ rbacModelId: gitPortfolioModel.id, name: "integration:view", description: "View connected services" }),
    };

    // Permission assignments
    await this.setRolePermissions(portfolioOwner.id, Object.values(gitPerms).map(p => p.id));
    await this.setRolePermissions(collaborator.id, [
      gitPerms.repositoryRead.id, gitPerms.repositoryUpdate.id,
      gitPerms.projectRead.id, gitPerms.projectUpdate.id,
      gitPerms.profileView.id, gitPerms.integrationView.id
    ]);
    await this.setRolePermissions(viewer.id, [
      gitPerms.profileView.id
    ]);

    // ===== MODEL 2: Fitness & Wellness Platform (Iron Path) =====
    const fitnessModel = await this.createRbacModel({
      name: "Fitness & Wellness Platform",
      description: "RBAC model for fitness tracking, workout planning, and wellness coaching platforms",
      createdBy: null,
    });

    const coachTrainer = await this.createRole({
      rbacModelId: fitnessModel.id,
      name: "Coach/Trainer",
      description: "Creates workout plans, tracks client progress, manages programs",
    });

    const premiumMember = await this.createRole({
      rbacModelId: fitnessModel.id,
      name: "Premium Member",
      description: "Full access to workouts, tracking, analytics, and custom plans",
    });

    const basicMember = await this.createRole({
      rbacModelId: fitnessModel.id,
      name: "Basic Member",
      description: "Access to basic workouts and tracking features",
    });

    const nutritionist = await this.createRole({
      rbacModelId: fitnessModel.id,
      name: "Nutritionist",
      description: "Manages meal plans, nutrition tracking, and dietary guidance",
    });

    const fitnessPerms = {
      workoutView: await this.createPermission({ rbacModelId: fitnessModel.id, name: "workout:view", description: "View workout library" }),
      workoutCreate: await this.createPermission({ rbacModelId: fitnessModel.id, name: "workout:create", description: "Create custom workouts" }),
      workoutEdit: await this.createPermission({ rbacModelId: fitnessModel.id, name: "workout:edit", description: "Modify workout plans" }),
      workoutDelete: await this.createPermission({ rbacModelId: fitnessModel.id, name: "workout:delete", description: "Remove workouts" }),
      workoutAssign: await this.createPermission({ rbacModelId: fitnessModel.id, name: "workout:assign", description: "Assign workouts to clients" }),
      progressView: await this.createPermission({ rbacModelId: fitnessModel.id, name: "progress:view", description: "View fitness progress" }),
      progressLog: await this.createPermission({ rbacModelId: fitnessModel.id, name: "progress:log", description: "Log workouts and exercises" }),
      progressAnalytics: await this.createPermission({ rbacModelId: fitnessModel.id, name: "progress:analytics", description: "Access detailed analytics" }),
      clientView: await this.createPermission({ rbacModelId: fitnessModel.id, name: "client:view", description: "View client list" }),
      clientManage: await this.createPermission({ rbacModelId: fitnessModel.id, name: "client:manage", description: "Add/remove clients" }),
      clientProgress: await this.createPermission({ rbacModelId: fitnessModel.id, name: "client:progress", description: "View client progress" }),
      nutritionView: await this.createPermission({ rbacModelId: fitnessModel.id, name: "nutrition:view", description: "View meal plans" }),
      nutritionCreate: await this.createPermission({ rbacModelId: fitnessModel.id, name: "nutrition:create", description: "Create meal plans" }),
      nutritionTrack: await this.createPermission({ rbacModelId: fitnessModel.id, name: "nutrition:track", description: "Track nutrition intake" }),
      programView: await this.createPermission({ rbacModelId: fitnessModel.id, name: "program:view", description: "View training programs" }),
      programCreate: await this.createPermission({ rbacModelId: fitnessModel.id, name: "program:create", description: "Create training programs" }),
      programEnroll: await this.createPermission({ rbacModelId: fitnessModel.id, name: "program:enroll", description: "Enroll in programs" }),
    };

    await this.setRolePermissions(coachTrainer.id, Object.values(fitnessPerms).map(p => p.id));
    await this.setRolePermissions(premiumMember.id, [
      fitnessPerms.workoutView.id, fitnessPerms.workoutCreate.id, fitnessPerms.workoutEdit.id,
      fitnessPerms.progressView.id, fitnessPerms.progressLog.id, fitnessPerms.progressAnalytics.id,
      fitnessPerms.nutritionView.id, fitnessPerms.nutritionTrack.id,
      fitnessPerms.programView.id, fitnessPerms.programEnroll.id
    ]);
    await this.setRolePermissions(basicMember.id, [
      fitnessPerms.workoutView.id,
      fitnessPerms.progressView.id, fitnessPerms.progressLog.id,
      fitnessPerms.nutritionView.id,
      fitnessPerms.programView.id, fitnessPerms.programEnroll.id
    ]);
    await this.setRolePermissions(nutritionist.id, [
      fitnessPerms.workoutView.id,
      fitnessPerms.progressView.id, fitnessPerms.progressLog.id, fitnessPerms.progressAnalytics.id,
      fitnessPerms.clientView.id, fitnessPerms.clientManage.id, fitnessPerms.clientProgress.id,
      fitnessPerms.nutritionView.id, fitnessPerms.nutritionCreate.id, fitnessPerms.nutritionTrack.id,
      fitnessPerms.programView.id, fitnessPerms.programEnroll.id
    ]);

    // ===== MODEL 3: Wealth Management & Financial Platform (PurpleGreen) =====
    const wealthModel = await this.createRbacModel({
      name: "Wealth Management & Financial Platform",
      description: "RBAC model for financial management, accounting, and wealth tracking systems with strict permission hierarchies",
      createdBy: null,
    });

    const accountOwner = await this.createRole({
      rbacModelId: wealthModel.id,
      name: "Account Owner",
      description: "Full control over financial accounts, settings, and data",
    });

    const financialAdvisor = await this.createRole({
      rbacModelId: wealthModel.id,
      name: "Financial Advisor",
      description: "Can view accounts, create reports, make recommendations",
    });

    const accountant = await this.createRole({
      rbacModelId: wealthModel.id,
      name: "Accountant",
      description: "Manages transactions, reconciliation, and tax documents",
    });

    const familyMember = await this.createRole({
      rbacModelId: wealthModel.id,
      name: "Family Member",
      description: "Limited access to view financial overview and specific accounts",
    });

    const auditor = await this.createRole({
      rbacModelId: wealthModel.id,
      name: "Auditor",
      description: "Read-only access to all financial records for compliance",
    });

    const wealthPerms = {
      accountView: await this.createPermission({ rbacModelId: wealthModel.id, name: "account:view", description: "View account details" }),
      accountCreate: await this.createPermission({ rbacModelId: wealthModel.id, name: "account:create", description: "Create new accounts" }),
      accountEdit: await this.createPermission({ rbacModelId: wealthModel.id, name: "account:edit", description: "Modify account information" }),
      accountDelete: await this.createPermission({ rbacModelId: wealthModel.id, name: "account:delete", description: "Remove accounts" }),
      accountReconcile: await this.createPermission({ rbacModelId: wealthModel.id, name: "account:reconcile", description: "Reconcile transactions" }),
      transactionView: await this.createPermission({ rbacModelId: wealthModel.id, name: "transaction:view", description: "View transactions" }),
      transactionCreate: await this.createPermission({ rbacModelId: wealthModel.id, name: "transaction:create", description: "Record new transactions" }),
      transactionEdit: await this.createPermission({ rbacModelId: wealthModel.id, name: "transaction:edit", description: "Modify transactions" }),
      transactionDelete: await this.createPermission({ rbacModelId: wealthModel.id, name: "transaction:delete", description: "Remove transactions" }),
      transactionCategorize: await this.createPermission({ rbacModelId: wealthModel.id, name: "transaction:categorize", description: "Categorize expenses/income" }),
      reportView: await this.createPermission({ rbacModelId: wealthModel.id, name: "report:view", description: "View financial reports" }),
      reportGenerate: await this.createPermission({ rbacModelId: wealthModel.id, name: "report:generate", description: "Create custom reports" }),
      reportExport: await this.createPermission({ rbacModelId: wealthModel.id, name: "report:export", description: "Export financial data" }),
      analyticsDashboard: await this.createPermission({ rbacModelId: wealthModel.id, name: "analytics:dashboard", description: "Access analytics dashboard" }),
      investmentView: await this.createPermission({ rbacModelId: wealthModel.id, name: "investment:view", description: "View investment portfolio" }),
      investmentTrade: await this.createPermission({ rbacModelId: wealthModel.id, name: "investment:trade", description: "Execute trades" }),
      investmentRebalance: await this.createPermission({ rbacModelId: wealthModel.id, name: "investment:rebalance", description: "Rebalance portfolio" }),
      settingsView: await this.createPermission({ rbacModelId: wealthModel.id, name: "settings:view", description: "View settings" }),
      settingsEdit: await this.createPermission({ rbacModelId: wealthModel.id, name: "settings:edit", description: "Modify configuration" }),
      securityManage: await this.createPermission({ rbacModelId: wealthModel.id, name: "security:manage", description: "Manage security settings" }),
    };

    await this.setRolePermissions(accountOwner.id, Object.values(wealthPerms).map(p => p.id));
    await this.setRolePermissions(financialAdvisor.id, [
      wealthPerms.accountView.id, wealthPerms.transactionView.id,
      wealthPerms.reportView.id, wealthPerms.reportGenerate.id, wealthPerms.reportExport.id,
      wealthPerms.analyticsDashboard.id, wealthPerms.investmentView.id
    ]);
    await this.setRolePermissions(accountant.id, [
      wealthPerms.accountView.id, wealthPerms.accountCreate.id, wealthPerms.accountEdit.id, wealthPerms.accountReconcile.id,
      wealthPerms.transactionView.id, wealthPerms.transactionCreate.id, wealthPerms.transactionEdit.id, wealthPerms.transactionCategorize.id,
      wealthPerms.reportView.id, wealthPerms.reportGenerate.id, wealthPerms.reportExport.id,
      wealthPerms.investmentView.id
    ]);
    await this.setRolePermissions(familyMember.id, [
      wealthPerms.accountView.id, wealthPerms.transactionView.id,
      wealthPerms.reportView.id, wealthPerms.investmentView.id
    ]);
    await this.setRolePermissions(auditor.id, [
      wealthPerms.accountView.id, wealthPerms.transactionView.id,
      wealthPerms.reportView.id, wealthPerms.reportGenerate.id, wealthPerms.reportExport.id,
      wealthPerms.investmentView.id
    ]);

    // ===== MODEL 4: Payment Processing Platform (BTCPay Dashboard) =====
    const paymentModel = await this.createRbacModel({
      name: "Payment Processing Platform",
      description: "RBAC model for cryptocurrency payment processing, merchant tools, and transaction management with security-focused permissions",
      createdBy: null,
    });

    const merchantOwner = await this.createRole({
      rbacModelId: paymentModel.id,
      name: "Merchant Owner",
      description: "Full administrative access to merchant account and payment settings",
    });

    const storeManager = await this.createRole({
      rbacModelId: paymentModel.id,
      name: "Store Manager",
      description: "Manages stores, invoices, and customer payments",
    });

    const paymentAccountant = await this.createRole({
      rbacModelId: paymentModel.id,
      name: "Accountant",
      description: "Access to financial reports, invoices, and transaction history",
    });

    const developer = await this.createRole({
      rbacModelId: paymentModel.id,
      name: "Developer",
      description: "Manages API keys, webhooks, and technical integrations",
    });

    const supportAgent = await this.createRole({
      rbacModelId: paymentModel.id,
      name: "Support Agent",
      description: "View-only access to help customers with payment issues",
    });

    const paymentPerms = {
      storeView: await this.createPermission({ rbacModelId: paymentModel.id, name: "store:view", description: "View store details" }),
      storeCreate: await this.createPermission({ rbacModelId: paymentModel.id, name: "store:create", description: "Create new stores" }),
      storeEdit: await this.createPermission({ rbacModelId: paymentModel.id, name: "store:edit", description: "Modify store configuration" }),
      storeDelete: await this.createPermission({ rbacModelId: paymentModel.id, name: "store:delete", description: "Remove stores" }),
      invoiceView: await this.createPermission({ rbacModelId: paymentModel.id, name: "invoice:view", description: "View invoices" }),
      invoiceCreate: await this.createPermission({ rbacModelId: paymentModel.id, name: "invoice:create", description: "Create payment invoices" }),
      invoiceRefund: await this.createPermission({ rbacModelId: paymentModel.id, name: "invoice:refund", description: "Process refunds" }),
      paymentView: await this.createPermission({ rbacModelId: paymentModel.id, name: "payment:view", description: "View payment transactions" }),
      paymentProcess: await this.createPermission({ rbacModelId: paymentModel.id, name: "payment:process", description: "Process payments manually" }),
      walletView: await this.createPermission({ rbacModelId: paymentModel.id, name: "wallet:view", description: "View wallet balances" }),
      walletSend: await this.createPermission({ rbacModelId: paymentModel.id, name: "wallet:send", description: "Send cryptocurrency" }),
      walletReceive: await this.createPermission({ rbacModelId: paymentModel.id, name: "wallet:receive", description: "Generate receive addresses" }),
      apiView: await this.createPermission({ rbacModelId: paymentModel.id, name: "api:view", description: "View API configurations" }),
      apiManage: await this.createPermission({ rbacModelId: paymentModel.id, name: "api:manage", description: "Create/revoke API keys" }),
      webhookManage: await this.createPermission({ rbacModelId: paymentModel.id, name: "webhook:manage", description: "Configure webhooks" }),
      reportView: await this.createPermission({ rbacModelId: paymentModel.id, name: "report:view", description: "View transaction reports" }),
      reportExport: await this.createPermission({ rbacModelId: paymentModel.id, name: "report:export", description: "Export financial data" }),
      securitySettings: await this.createPermission({ rbacModelId: paymentModel.id, name: "security:settings", description: "Manage security configuration" }),
      securityAudit: await this.createPermission({ rbacModelId: paymentModel.id, name: "security:audit", description: "View security audit logs" }),
    };

    await this.setRolePermissions(merchantOwner.id, Object.values(paymentPerms).map(p => p.id));
    await this.setRolePermissions(storeManager.id, [
      paymentPerms.storeView.id, paymentPerms.storeEdit.id,
      paymentPerms.invoiceView.id, paymentPerms.invoiceCreate.id, paymentPerms.invoiceRefund.id,
      paymentPerms.paymentView.id, paymentPerms.paymentProcess.id,
      paymentPerms.walletView.id,
      paymentPerms.reportView.id, paymentPerms.reportExport.id
    ]);
    await this.setRolePermissions(paymentAccountant.id, [
      paymentPerms.invoiceView.id, paymentPerms.paymentView.id,
      paymentPerms.walletView.id,
      paymentPerms.reportView.id, paymentPerms.reportExport.id
    ]);
    await this.setRolePermissions(developer.id, [
      paymentPerms.invoiceView.id, paymentPerms.paymentView.id,
      paymentPerms.apiView.id, paymentPerms.apiManage.id, paymentPerms.webhookManage.id,
      paymentPerms.reportView.id, paymentPerms.securityAudit.id
    ]);
    await this.setRolePermissions(supportAgent.id, [
      paymentPerms.invoiceView.id, paymentPerms.paymentView.id,
      paymentPerms.reportView.id, paymentPerms.securityAudit.id
    ]);

    // ===== MODEL 5: Gamification & Achievement Platform (Quest Armory) =====
    const gamificationModel = await this.createRbacModel({
      name: "Gamification & Achievement Platform",
      description: "RBAC model for quest-based systems, achievements, challenges, and gamification platforms",
      createdBy: null,
    });

    const gameMaster = await this.createRole({
      rbacModelId: gamificationModel.id,
      name: "Game Master",
      description: "Creates quests, manages challenges, and configures achievement systems",
    });

    const questDesigner = await this.createRole({
      rbacModelId: gamificationModel.id,
      name: "Quest Designer",
      description: "Designs and publishes quests and challenges",
    });

    const player = await this.createRole({
      rbacModelId: gamificationModel.id,
      name: "Player",
      description: "Participates in quests, earns achievements, tracks progress",
    });

    const moderator = await this.createRole({
      rbacModelId: gamificationModel.id,
      name: "Moderator",
      description: "Reviews quest submissions, moderates content",
    });

    const gamePerms = {
      questView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:view", description: "View available quests" }),
      questCreate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:create", description: "Create new quests" }),
      questEdit: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:edit", description: "Modify quest details" }),
      questDelete: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:delete", description: "Remove quests" }),
      questPublish: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:publish", description: "Publish quests to players" }),
      questParticipate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "quest:participate", description: "Join and complete quests" }),
      achievementView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "achievement:view", description: "View achievements" }),
      achievementCreate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "achievement:create", description: "Create new achievements" }),
      achievementAward: await this.createPermission({ rbacModelId: gamificationModel.id, name: "achievement:award", description: "Award achievements to players" }),
      achievementRevoke: await this.createPermission({ rbacModelId: gamificationModel.id, name: "achievement:revoke", description: "Revoke achievements" }),
      challengeView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "challenge:view", description: "View challenges" }),
      challengeCreate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "challenge:create", description: "Create challenges" }),
      challengeJoin: await this.createPermission({ rbacModelId: gamificationModel.id, name: "challenge:join", description: "Participate in challenges" }),
      challengeModerate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "challenge:moderate", description: "Review and approve challenges" }),
      leaderboardView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "leaderboard:view", description: "View leaderboards" }),
      progressTrack: await this.createPermission({ rbacModelId: gamificationModel.id, name: "progress:track", description: "Track personal progress" }),
      progressView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "progress:view", description: "View player statistics" }),
      rewardView: await this.createPermission({ rbacModelId: gamificationModel.id, name: "reward:view", description: "View available rewards" }),
      rewardCreate: await this.createPermission({ rbacModelId: gamificationModel.id, name: "reward:create", description: "Create rewards" }),
      rewardClaim: await this.createPermission({ rbacModelId: gamificationModel.id, name: "reward:claim", description: "Claim earned rewards" }),
      rewardGrant: await this.createPermission({ rbacModelId: gamificationModel.id, name: "reward:grant", description: "Grant rewards to players" }),
    };

    await this.setRolePermissions(gameMaster.id, Object.values(gamePerms).map(p => p.id));
    await this.setRolePermissions(questDesigner.id, [
      gamePerms.questView.id, gamePerms.questCreate.id, gamePerms.questEdit.id, gamePerms.questDelete.id, gamePerms.questPublish.id, gamePerms.questParticipate.id,
      gamePerms.achievementView.id, gamePerms.achievementCreate.id,
      gamePerms.challengeView.id, gamePerms.challengeCreate.id, gamePerms.challengeJoin.id,
      gamePerms.leaderboardView.id, gamePerms.progressTrack.id, gamePerms.progressView.id,
      gamePerms.rewardView.id, gamePerms.rewardCreate.id, gamePerms.rewardClaim.id
    ]);
    await this.setRolePermissions(player.id, [
      gamePerms.questView.id, gamePerms.questParticipate.id,
      gamePerms.achievementView.id,
      gamePerms.challengeView.id, gamePerms.challengeJoin.id,
      gamePerms.leaderboardView.id, gamePerms.progressTrack.id,
      gamePerms.rewardView.id, gamePerms.rewardClaim.id
    ]);
    await this.setRolePermissions(moderator.id, [
      gamePerms.questView.id, gamePerms.questParticipate.id,
      gamePerms.achievementView.id, gamePerms.achievementAward.id, gamePerms.achievementRevoke.id,
      gamePerms.challengeView.id, gamePerms.challengeJoin.id, gamePerms.challengeModerate.id,
      gamePerms.leaderboardView.id, gamePerms.progressTrack.id, gamePerms.progressView.id,
      gamePerms.rewardView.id, gamePerms.rewardClaim.id, gamePerms.rewardGrant.id
    ]);

    // ===== MODEL 6: Monitoring & Health Check Platform (Git Healthz) =====
    const monitoringModel = await this.createRbacModel({
      name: "Monitoring & Health Check Platform",
      description: "RBAC model for service health monitoring, uptime tracking, and incident management systems",
      createdBy: null,
    });

    const platformAdmin = await this.createRole({
      rbacModelId: monitoringModel.id,
      name: "Platform Admin",
      description: "Full control over monitoring systems, alerts, and configurations",
    });

    const sre = await this.createRole({
      rbacModelId: monitoringModel.id,
      name: "Site Reliability Engineer",
      description: "Manages monitors, responds to incidents, configures alerts",
    });

    const monitoringDeveloper = await this.createRole({
      rbacModelId: monitoringModel.id,
      name: "Developer",
      description: "Views service health, creates basic monitors for their services",
    });

    const operationsViewer = await this.createRole({
      rbacModelId: monitoringModel.id,
      name: "Operations Viewer",
      description: "Read-only access to dashboards and incident reports",
    });

    const monitoringPerms = {
      monitorView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "monitor:view", description: "View monitoring configurations" }),
      monitorCreate: await this.createPermission({ rbacModelId: monitoringModel.id, name: "monitor:create", description: "Create new monitors" }),
      monitorEdit: await this.createPermission({ rbacModelId: monitoringModel.id, name: "monitor:edit", description: "Modify monitor settings" }),
      monitorDelete: await this.createPermission({ rbacModelId: monitoringModel.id, name: "monitor:delete", description: "Remove monitors" }),
      monitorEnable: await this.createPermission({ rbacModelId: monitoringModel.id, name: "monitor:enable", description: "Enable/disable monitors" }),
      incidentView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "incident:view", description: "View active incidents" }),
      incidentCreate: await this.createPermission({ rbacModelId: monitoringModel.id, name: "incident:create", description: "Create incident reports" }),
      incidentAcknowledge: await this.createPermission({ rbacModelId: monitoringModel.id, name: "incident:acknowledge", description: "Acknowledge incidents" }),
      incidentResolve: await this.createPermission({ rbacModelId: monitoringModel.id, name: "incident:resolve", description: "Mark incidents as resolved" }),
      incidentPostmortem: await this.createPermission({ rbacModelId: monitoringModel.id, name: "incident:postmortem", description: "Create postmortem reports" }),
      alertView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "alert:view", description: "View alert rules" }),
      alertCreate: await this.createPermission({ rbacModelId: monitoringModel.id, name: "alert:create", description: "Create alert rules" }),
      alertEdit: await this.createPermission({ rbacModelId: monitoringModel.id, name: "alert:edit", description: "Modify alerts" }),
      alertSilence: await this.createPermission({ rbacModelId: monitoringModel.id, name: "alert:silence", description: "Silence noisy alerts" }),
      dashboardView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "dashboard:view", description: "View health dashboards" }),
      dashboardCreate: await this.createPermission({ rbacModelId: monitoringModel.id, name: "dashboard:create", description: "Create custom dashboards" }),
      metricsView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "metrics:view", description: "View detailed metrics" }),
      metricsExport: await this.createPermission({ rbacModelId: monitoringModel.id, name: "metrics:export", description: "Export metric data" }),
      integrationView: await this.createPermission({ rbacModelId: monitoringModel.id, name: "integration:view", description: "View connected services" }),
      integrationConfigure: await this.createPermission({ rbacModelId: monitoringModel.id, name: "integration:configure", description: "Configure integrations (Slack, PagerDuty)" }),
    };

    await this.setRolePermissions(platformAdmin.id, Object.values(monitoringPerms).map(p => p.id));
    await this.setRolePermissions(sre.id, [
      monitoringPerms.monitorView.id, monitoringPerms.monitorCreate.id, monitoringPerms.monitorEdit.id, monitoringPerms.monitorEnable.id,
      monitoringPerms.incidentView.id, monitoringPerms.incidentCreate.id, monitoringPerms.incidentAcknowledge.id, monitoringPerms.incidentResolve.id, monitoringPerms.incidentPostmortem.id,
      monitoringPerms.alertView.id, monitoringPerms.alertCreate.id, monitoringPerms.alertEdit.id, monitoringPerms.alertSilence.id,
      monitoringPerms.dashboardView.id, monitoringPerms.dashboardCreate.id,
      monitoringPerms.metricsView.id, monitoringPerms.metricsExport.id,
      monitoringPerms.integrationView.id, monitoringPerms.integrationConfigure.id
    ]);
    await this.setRolePermissions(monitoringDeveloper.id, [
      monitoringPerms.monitorView.id, monitoringPerms.monitorCreate.id, monitoringPerms.monitorEdit.id,
      monitoringPerms.incidentView.id, monitoringPerms.incidentCreate.id, monitoringPerms.incidentAcknowledge.id, monitoringPerms.incidentResolve.id, monitoringPerms.incidentPostmortem.id,
      monitoringPerms.alertView.id, monitoringPerms.alertCreate.id,
      monitoringPerms.dashboardView.id, monitoringPerms.dashboardCreate.id,
      monitoringPerms.metricsView.id
    ]);
    await this.setRolePermissions(operationsViewer.id, [
      monitoringPerms.monitorView.id,
      monitoringPerms.incidentView.id,
      monitoringPerms.dashboardView.id,
      monitoringPerms.metricsView.id
    ]);

    // ===== MODEL 7: Academic Knowledge Management (Academia Vault) =====
    const academicModel = await this.createRbacModel({
      name: "Academic Knowledge Management",
      description: "RBAC model for academic resource management, research collaboration, and educational content platforms",
      createdBy: null,
    });

    const administrator = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Administrator",
      description: "Manages the entire platform, users, and institutional settings",
    });

    const professor = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Professor/Instructor",
      description: "Creates courses, manages resources, grades students",
    });

    const researcher = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Researcher",
      description: "Publishes research papers, manages datasets, collaborates",
    });

    const student = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Student",
      description: "Accesses course materials, submits assignments, views grades",
    });

    const librarian = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Librarian",
      description: "Organizes resources, manages cataloging, assists users",
    });

    const guest = await this.createRole({
      rbacModelId: academicModel.id,
      name: "Guest",
      description: "Limited access to public resources and course catalogs",
    });

    const academicPerms = {
      courseView: await this.createPermission({ rbacModelId: academicModel.id, name: "course:view", description: "View course information" }),
      courseCreate: await this.createPermission({ rbacModelId: academicModel.id, name: "course:create", description: "Create new courses" }),
      courseEdit: await this.createPermission({ rbacModelId: academicModel.id, name: "course:edit", description: "Modify course content" }),
      courseDelete: await this.createPermission({ rbacModelId: academicModel.id, name: "course:delete", description: "Remove courses" }),
      courseEnroll: await this.createPermission({ rbacModelId: academicModel.id, name: "course:enroll", description: "Enroll in courses" }),
      resourceView: await this.createPermission({ rbacModelId: academicModel.id, name: "resource:view", description: "View academic resources" }),
      resourceUpload: await this.createPermission({ rbacModelId: academicModel.id, name: "resource:upload", description: "Upload documents, papers, datasets" }),
      resourceEdit: await this.createPermission({ rbacModelId: academicModel.id, name: "resource:edit", description: "Modify resource metadata" }),
      resourceDelete: await this.createPermission({ rbacModelId: academicModel.id, name: "resource:delete", description: "Remove resources" }),
      resourceDownload: await this.createPermission({ rbacModelId: academicModel.id, name: "resource:download", description: "Download materials" }),
      researchPublish: await this.createPermission({ rbacModelId: academicModel.id, name: "research:publish", description: "Publish research papers" }),
      researchReview: await this.createPermission({ rbacModelId: academicModel.id, name: "research:review", description: "Peer review submissions" }),
      researchCollaborate: await this.createPermission({ rbacModelId: academicModel.id, name: "research:collaborate", description: "Collaborate on research" }),
      datasetManage: await this.createPermission({ rbacModelId: academicModel.id, name: "dataset:manage", description: "Upload and manage research data" }),
      assignmentCreate: await this.createPermission({ rbacModelId: academicModel.id, name: "assignment:create", description: "Create assignments" }),
      assignmentSubmit: await this.createPermission({ rbacModelId: academicModel.id, name: "assignment:submit", description: "Submit student work" }),
      assignmentGrade: await this.createPermission({ rbacModelId: academicModel.id, name: "assignment:grade", description: "Grade submissions" }),
      gradeView: await this.createPermission({ rbacModelId: academicModel.id, name: "grade:view", description: "View grades" }),
      libraryOrganize: await this.createPermission({ rbacModelId: academicModel.id, name: "library:organize", description: "Organize and categorize resources" }),
      libraryCatalog: await this.createPermission({ rbacModelId: academicModel.id, name: "library:catalog", description: "Add metadata and tags" }),
      citationManage: await this.createPermission({ rbacModelId: academicModel.id, name: "citation:manage", description: "Manage citations and references" }),
      userView: await this.createPermission({ rbacModelId: academicModel.id, name: "user:view", description: "View user directory" }),
      userManage: await this.createPermission({ rbacModelId: academicModel.id, name: "user:manage", description: "Add/remove users" }),
      enrollmentManage: await this.createPermission({ rbacModelId: academicModel.id, name: "enrollment:manage", description: "Manage course enrollments" }),
    };

    await this.setRolePermissions(administrator.id, Object.values(academicPerms).map(p => p.id));
    await this.setRolePermissions(professor.id, [
      academicPerms.courseView.id, academicPerms.courseCreate.id, academicPerms.courseEdit.id,
      academicPerms.resourceView.id, academicPerms.resourceUpload.id, academicPerms.resourceDownload.id,
      academicPerms.researchPublish.id, academicPerms.researchReview.id,
      academicPerms.assignmentCreate.id, academicPerms.assignmentGrade.id,
      academicPerms.gradeView.id, academicPerms.enrollmentManage.id
    ]);
    await this.setRolePermissions(researcher.id, [
      academicPerms.courseView.id,
      academicPerms.resourceView.id, academicPerms.resourceUpload.id, academicPerms.resourceDownload.id,
      academicPerms.researchPublish.id, academicPerms.researchReview.id, academicPerms.researchCollaborate.id,
      academicPerms.datasetManage.id
    ]);
    await this.setRolePermissions(student.id, [
      academicPerms.courseView.id, academicPerms.courseEnroll.id,
      academicPerms.resourceView.id, academicPerms.resourceUpload.id, academicPerms.resourceDownload.id,
      academicPerms.assignmentSubmit.id, academicPerms.gradeView.id
    ]);
    await this.setRolePermissions(librarian.id, [
      academicPerms.courseView.id,
      academicPerms.resourceView.id, academicPerms.resourceUpload.id, academicPerms.resourceDownload.id,
      academicPerms.libraryOrganize.id, academicPerms.libraryCatalog.id, academicPerms.citationManage.id
    ]);
    await this.setRolePermissions(guest.id, [
      academicPerms.courseView.id, academicPerms.resourceView.id
    ]);

    // ===== MODEL 8: Authentication Hub Platform (AuthHub) =====
    const authHubModel = await this.createRbacModel({
      name: "Authentication Hub Platform",
      description: "RBAC model for the AuthHub platform itself, managing authentication services, global services, users, RBAC models, role assignments, and login page configurations",
      createdBy: null,
    });

    const admin = await this.createRole({
      rbacModelId: authHubModel.id,
      name: "Admin",
      description: "Full platform control with access to all AuthHub features",
    });

    const user = await this.createRole({
      rbacModelId: authHubModel.id,
      name: "User",
      description: "Standard user with access to personal profile and services",
    });

    const authHubPerms = {
      userView: await this.createPermission({ rbacModelId: authHubModel.id, name: "user:view", description: "View all users in the system" }),
      userEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "user:edit", description: "Edit user details (email, role)" }),
      userDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "user:delete", description: "Remove users from the system" }),
      userRoles: await this.createPermission({ rbacModelId: authHubModel.id, name: "user:roles", description: "View user service role assignments" }),
      serviceView: await this.createPermission({ rbacModelId: authHubModel.id, name: "service:view", description: "View all global services" }),
      serviceCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "service:create", description: "Create new global services" }),
      serviceEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "service:edit", description: "Modify service configuration" }),
      serviceDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "service:delete", description: "Remove global services" }),
      serviceSecret: await this.createPermission({ rbacModelId: authHubModel.id, name: "service:secret", description: "Rotate service secrets" }),
      rbacView: await this.createPermission({ rbacModelId: authHubModel.id, name: "rbac:view", description: "View RBAC models and their details" }),
      rbacCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "rbac:create", description: "Create new RBAC models" }),
      rbacEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "rbac:edit", description: "Modify RBAC model configurations" }),
      rbacDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "rbac:delete", description: "Remove RBAC models" }),
      rbacAssign: await this.createPermission({ rbacModelId: authHubModel.id, name: "rbac:assign", description: "Assign RBAC models to services" }),
      roleView: await this.createPermission({ rbacModelId: authHubModel.id, name: "role:view", description: "View roles within RBAC models" }),
      roleCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "role:create", description: "Create roles in RBAC models" }),
      roleEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "role:edit", description: "Modify role details" }),
      roleDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "role:delete", description: "Remove roles" }),
      permissionCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "permission:create", description: "Create permissions in RBAC models" }),
      permissionAssign: await this.createPermission({ rbacModelId: authHubModel.id, name: "permission:assign", description: "Assign permissions to roles" }),
      assignmentView: await this.createPermission({ rbacModelId: authHubModel.id, name: "assignment:view", description: "View user-service-role assignments" }),
      assignmentCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "assignment:create", description: "Assign users to service roles" }),
      assignmentDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "assignment:delete", description: "Remove user service role assignments" }),
      loginView: await this.createPermission({ rbacModelId: authHubModel.id, name: "login:view", description: "View login page configurations" }),
      loginCreate: await this.createPermission({ rbacModelId: authHubModel.id, name: "login:create", description: "Create new login configurations" }),
      loginEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "login:edit", description: "Modify login configurations and branding" }),
      loginDelete: await this.createPermission({ rbacModelId: authHubModel.id, name: "login:delete", description: "Remove login configurations" }),
      loginAssign: await this.createPermission({ rbacModelId: authHubModel.id, name: "login:assign", description: "Assign login configs to services" }),
      authMethodManage: await this.createPermission({ rbacModelId: authHubModel.id, name: "auth-method:manage", description: "Enable/disable auth methods, update order" }),
      dashboardView: await this.createPermission({ rbacModelId: authHubModel.id, name: "dashboard:view", description: "View admin dashboard with metrics" }),
      analyticsView: await this.createPermission({ rbacModelId: authHubModel.id, name: "analytics:view", description: "View platform analytics and statistics" }),
      profileView: await this.createPermission({ rbacModelId: authHubModel.id, name: "profile:view", description: "View own profile" }),
      profileEdit: await this.createPermission({ rbacModelId: authHubModel.id, name: "profile:edit", description: "Edit own profile details" }),
    };

    await this.setRolePermissions(admin.id, Object.values(authHubPerms).map(p => p.id));
    await this.setRolePermissions(user.id, [
      authHubPerms.profileView.id, authHubPerms.profileEdit.id
    ]);

    console.log("✅ Successfully seeded 8 comprehensive RBAC models aligned with all default services");
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
    
    // Create standalone login page configuration
    const implementedMethods = strategyRegistry.getImplementedIds();
    
    const [config] = await db.insert(loginPageConfig).values({
      title: "Welcome to AuthHub",
      description: "Choose your preferred authentication method",
      defaultMethod: implementedMethods[0] || "uuid",
    }).returning();
    
    console.log(`[Storage] Created login config ${config.id} for service ${serviceId}`);
    
    // Assign the config to the service
    await db.update(services).set({ loginConfigId: config.id }).where(eq(services.id, serviceId));
    
    // Seed service auth methods for this config
    const allAuthMethods = await db.select().from(authMethods);
    const serviceAuthMethodsData = allAuthMethods.map((method, index) => ({
      loginConfigId: config.id,
      authMethodId: method.id,
      enabled: true,
      showComingSoonBadge: !method.implemented,
      displayOrder: index,
      methodCategory: method.id === "uuid" ? "primary" : method.id === "email" ? "secondary" : "alternative",
    }));
    
    if (serviceAuthMethodsData.length > 0) {
      await db.insert(serviceAuthMethods).values(serviceAuthMethodsData);
      console.log(`[Storage] Created ${serviceAuthMethodsData.length} service auth methods for config ${config.id}`);
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

  async getLoginPageConfigByServiceId(serviceId: string): Promise<LoginPageConfig | undefined> {
    // Get the service and find its login config
    const service = await this.getServiceById(serviceId);
    if (!service || !service.loginConfigId) {
      return undefined;
    }
    
    return await this.getLoginPageConfigById(service.loginConfigId);
  }

  async getAllLoginPageConfigs(): Promise<any[]> {
    // Fetch all configs - they are now standalone entities
    const configs = await db
      .select({
        id: loginPageConfig.id,
        title: loginPageConfig.title,
        description: loginPageConfig.description,
        logoUrl: loginPageConfig.logoUrl,
        primaryColor: loginPageConfig.primaryColor,
        defaultMethod: loginPageConfig.defaultMethod,
        createdAt: loginPageConfig.createdAt,
        updatedAt: loginPageConfig.updatedAt,
      })
      .from(loginPageConfig);

    // For each config, count the enabled methods and get assigned services
    const configsWithCounts = await Promise.all(
      configs.map(async (config) => {
        const [result] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(serviceAuthMethods)
          .where(
            and(
              eq(serviceAuthMethods.loginConfigId, config.id),
              eq(serviceAuthMethods.enabled, true)
            )
          );
        
        // Get all services using this config
        const assignedServices = await db
          .select({
            id: services.id,
            name: services.name,
          })
          .from(services)
          .where(eq(services.loginConfigId, config.id));
        
        return {
          ...config,
          enabledMethodsCount: result?.count || 0,
          services: assignedServices,
        };
      })
    );

    return configsWithCounts;
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

  async updateServiceAuthMethodsOrder(updates: Array<{ id: string; displayOrder: number; enabled?: boolean; methodCategory?: string }>): Promise<void> {
    for (const update of updates) {
      const updateData: any = { 
        displayOrder: update.displayOrder, 
        updatedAt: new Date() 
      };
      
      if (update.enabled !== undefined) {
        updateData.enabled = update.enabled;
      }
      
      if (update.methodCategory !== undefined) {
        updateData.methodCategory = update.methodCategory;
      }
      
      await db
        .update(serviceAuthMethods)
        .set(updateData)
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

  async assignLoginConfigToService(configId: string, serviceId: string | null): Promise<Service> {
    // Update the service's loginConfigId field to point to this config
    // Multiple services can now share the same login config
    if (!serviceId) {
      throw new Error("serviceId is required");
    }
    
    const [updated] = await db
      .update(services)
      .set({ loginConfigId: configId })
      .where(eq(services.id, serviceId))
      .returning();
    return updated;
  }

  async getLoginConfigForService(serviceId: string): Promise<LoginPageConfig | undefined> {
    // Get the service's loginConfigId and fetch that config
    const service = await this.getServiceById(serviceId);
    if (!service || !service.loginConfigId) {
      return undefined;
    }
    
    return await this.getLoginPageConfigById(service.loginConfigId);
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
