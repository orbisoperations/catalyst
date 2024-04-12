import {initTRPC} from '@trpc/server';
import {z} from 'zod';
import {Context} from "./index"
import {WriteRelationshipsRequest} from "@buf/authzed_api.bufbuild_es/authzed/api/v1/permission_service_pb"
import {ReadSchemaRequest} from "@buf/authzed_api.bufbuild_es/authzed/api/v1/schema_service_pb"
import {
	ObjectReference,
	SubjectReference,
	Relationship,
	RelationshipUpdate,
	RelationshipUpdate_Operation,
} from "@buf/authzed_api.bufbuild_es/authzed/api/v1/core_pb"

import { Logger } from "tslog"
import {v1} from "@authzed/authzed-node"
const logger = new Logger()

const t = initTRPC.context<Context>().create();


const publicProcedure = t.procedure;
const router = t.router;

export const appRouter = router({
	health: publicProcedure
		.query(() => {
			return "ok"
		}),
	authzedSchema: publicProcedure
		.mutation(async ({ctx}) => {
		}),
	organization: router({
		relations: router({
			admin: router({
				create: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				delete: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				check: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {

					}),
				list: publicProcedure
					.input(z.object({
						orgId: z.string()
					}))
					.query(({input}) => {})
			}),
			dataCustodian: router({
				create: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				delete: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				check: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {

					})
				,
				list: publicProcedure
					.input(z.object({
						orgId: z.string()
					}))
					.query(({input}) => {})
			}),
			user: router({
				delete: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {
					}),
				check: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {

					}),
				sync: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(async ({input, ctx}) => {
						console.log(`syncing user: ${input.orgId}@${input.userId}`)
						// add authzed lib here
						/*const newUserRelation = new WriteRelationshipsRequest({
							updates: [
								new RelationshipUpdate({
									operation: RelationshipUpdate_Operation.TOUCH,
									relationship: new Relationship({
										resource: new ObjectReference({
											objectType: "orbisops_catalyst_dev/organization",
											objectId: input.orgId
										}),
										relation: "user",
										subject: new SubjectReference({
											object: new ObjectReference({
												objectType: "orbisops_catalyst_dev/user",
												objectId: input.userId
											})
										})
									})
								})
							]
						})

						try {
							const resp =  await ctx.client.client.writeRelationships(
								newUserRelation,
								{headers: {"Authorization": "Bearer AbCdEf123456"}})
							return true
						} catch (e) {
							throw e
							logger.error(e)
							return false
						}*/

						const client = v1.NewClient(ctx.env.AUTHZED_KEY, ctx.env.AUTHZED_ENDPOINT)
						const { promises: promiseClient } = client;
						const scheamRead = await promiseClient.readSchema(v1.ReadSchemaRequest.create())


					}),
				list: publicProcedure
					.input(z.object({
						orgId: z.string()
					}))
					.query(({input}) => {})
			}),
			orgPartnership: router({
				create: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				delete: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				check: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {

					})
				,
				list: publicProcedure
					.input(z.object({
						orgId: z.string()
					}))
					.query(({input}) => {})
			}),
			dataChannel: router({
				create: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				delete: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.mutation(({input}) => {

					}),
				check: publicProcedure
					.input(z.object({
						userId: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {

					})
				,
				list: publicProcedure
					.input(z.object({
						orgId: z.string()
					}))
					.query(({input}) => {})
			})
		}),
		permissions: router({
			membership: publicProcedure
				.input(z.object({
					userId: z.string(),
					orgId: z.string()
				}))
				.query(({input}) => {}),
			assignRole: publicProcedure
				.input(z.object({
					userId: z.string(),
					orgId: z.string(),
					role: z.enum(["ADMIN", "DATA_CUSTODIAN"])
				}))
				.mutation(({input}) => {}),
			dataChannel: router({
				create: publicProcedure
					.input(z.object({
						userid: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {}),
				update: publicProcedure
					.input(z.object({
						userid: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {}),
				delete: publicProcedure
					.input(z.object({
						userid: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {}),
				read: publicProcedure
					.input(z.object({
						userid: z.string(),
						orgId: z.string()
					}))
					.query(({input}) => {})
			})
		})
	}),
	dataChannels: router({
		relations: router({
			organization: router({
				create: publicProcedure
					.input(z.object({
						orgId: z.string(),
						dataChannelId: z.string()
					}))
					.mutation(({input}) => {}),
				delete: publicProcedure
					.input(z.object({
						orgId: z.string(),
						dataChannelId: z.string()
					}))
					.mutation(({input}) => {}),
				check: publicProcedure
					.input(z.object({
						orgId: z.string(),
						dataChannelId: z.string()
					}))
					.query(({input}) => {}),
				list: publicProcedure
					.input(z.object({
						dataChannelId: z.string()
					}))
					.query(({input}) => {}),
			})
		}),
		permissions: router({
			read: publicProcedure
				.input(z.object({
					userId: z.string(),
					dataChannelId: z.string(),
				}))
				.query(({input}) => {

				})
		})
	})
});

export type AppRouter = typeof appRouter;
