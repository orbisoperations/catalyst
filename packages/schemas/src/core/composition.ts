import { z } from 'zod/v4';
import { OrgIdSchema, UserIdSchema } from './identifiers';

/**
 * Reusable schema compositions to reduce duplication and improve maintainability
 */

// Common metadata pattern used across many entities
export const BaseMetadataSchema = z.object({
    id: z.string().min(1, 'ID is required').max(100, 'ID too long'),
    createdAt: z.number().int().positive('Created timestamp must be positive'),
    updatedAt: z.number().int().positive('Updated timestamp must be positive'),
});

// Common entity with name/description pattern
export const NamedEntitySchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name too long')
        .trim()
        .regex(/^[a-zA-Z0-9\s_-]+$/, 'Name contains invalid characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description too long').trim(),
});

// AuthZed object reference pattern (used extensively in relationships)
export const AuthzedObjectSchema = z.object({
    objectType: z.string().min(1, 'Object type is required'),
    objectId: z.string().min(1, 'Object ID is required'),
});

// AuthZed relationship pattern
export const AuthzedRelationshipSchema = z.object({
    resource: AuthzedObjectSchema,
    relation: z.string().min(1, 'Relation is required'),
    subject: z.object({
        object: AuthzedObjectSchema,
        optionalRelation: z.string().optional(),
    }),
});

// Common audit trail pattern
export const AuditTrailSchema = z.object({
    createdBy: UserIdSchema.optional(),
    updatedBy: UserIdSchema.optional(),
    organization: OrgIdSchema,
});

// Pagination metadata
export const PaginationMetaSchema = z.object({
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    total: z.number().int().min(0, 'Total must be non-negative'),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
});

// Paginated response wrapper
export const createPaginatedResponse = <T>(dataSchema: z.ZodType<T>) =>
    z.object({
        data: z.array(dataSchema),
        meta: PaginationMetaSchema,
    });

// Status-enabled entity pattern
export const StatusEntitySchema = z.object({
    isActive: z.boolean().default(true),
    status: z.enum(['active', 'inactive', 'suspended']).default('active'),
});

// Permission check result pattern
export const PermissionResultSchema = z.object({
    permitted: z.boolean(),
    reason: z.string().optional(),
    checkedAt: z.date().default(() => new Date()),
});

// Bulk operation result pattern
export const BulkOperationResultSchema = <T>(itemSchema: z.ZodType<T>) =>
    z.object({
        successful: z.array(itemSchema),
        failed: z.array(
            z.object({
                item: itemSchema,
                error: z.string(),
            })
        ),
        summary: z.object({
            total: z.number().int().min(0),
            successful: z.number().int().min(0),
            failed: z.number().int().min(0),
        }),
    });

// Timestamped entity mixin
export const withTimestamps = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    schema.extend({
        createdAt: z.number().int().positive(),
        updatedAt: z.number().int().positive(),
    });

// Audit trail mixin
export const withAudit = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    schema.extend({
        createdBy: UserIdSchema.optional(),
        updatedBy: UserIdSchema.optional(),
        organization: OrgIdSchema,
    });

// Soft delete mixin
export const withSoftDelete = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    schema.extend({
        isDeleted: z.boolean().default(false),
        deletedAt: z.number().int().positive().optional(),
        deletedBy: UserIdSchema.optional(),
    });
