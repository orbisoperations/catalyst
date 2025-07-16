import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const jobStatusEnum = ['pending', 'running', 'completed', 'failed'] as const;

export const jobs = sqliteTable('jobs', {
    jobId: text('job_id').primaryKey(),
    status: text('status', { enum: jobStatusEnum }).notNull().default('pending'),
    submittedTimestamp: integer('submitted_timestamp', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    modifiedTimestamp: integer('modified_timestamp', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s', 'now'))`),
    resultBucket: text('result_bucket'),
    dataChannelId: text('data_channel_id'),
    submittedBy: text('submitted_by'),
});
