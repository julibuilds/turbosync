import { z } from "zod";

// Repository schema
export const RepositorySchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  branch: z.string().min(1).max(255),
  directory: z.string().min(1).max(255),
  subtreePrefix: z.string().min(1).max(255),
  lastUpdated: z.string().datetime(),
  packageName: z.string().min(1).max(255).optional(),
});

// TurboSync config schema
export const TurboSyncConfigSchema = z.object({
  repositories: z.array(RepositorySchema),
  defaultBranch: z.string().min(1).max(255),
  defaultDirectory: z.string().min(1).max(255),
  packageManager: z.enum(["npm", "yarn", "pnpm", "bun"]),
  workspaceType: z.enum(["turborepo", "nx", "generic"]),
});

// Package.json schema (partial - only what we need)
export const PackageJsonSchema = z
  .object({
    name: z.string().optional(),
    version: z.string().optional(),
    workspaces: z
      .union([
        z.array(z.string()),
        z.object({
          packages: z.array(z.string()),
        }),
      ])
      .optional(),
    repository: z
      .union([
        z.string(),
        z.object({
          type: z.string(),
          url: z.string(),
        }),
      ])
      .optional(),
  })
  .passthrough(); // Allow additional properties

// Export types inferred from schemas
export type ValidatedRepository = z.infer<typeof RepositorySchema>;
export type ValidatedTurboSyncConfig = z.infer<typeof TurboSyncConfigSchema>;
export type ValidatedPackageJson = z.infer<typeof PackageJsonSchema>;
