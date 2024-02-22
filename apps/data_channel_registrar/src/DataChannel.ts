import { builder } from './builder'
import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

export class DataChannel {
    organization: string
    name: string
    endpoint: string

    constructor(org: string, name: string, endpoint: string) {
        this.organization = org
        this.name = name
        this.endpoint = endpoint
    }
}


    builder.prismaObject('DataChannel', {
        fields: (t) => ({
            organization: t.exposeString('organization'),
            name: t.exposeString('name'),
            endpoint: t.exposeString('endpoint')
        }),
    })
    builder.queryField('listDataChannels', (t) =>
        t.prismaField({
                type: ['DataChannel'],
                nullable: {
                    list: false,
                    items: true
                },
                args: {
                    name: t.arg.string({required: false}),
                    organization: t.arg.string({required: false}),
                },
                resolve: async (query, root, args, context , info) => {
                    console.log(context, " DB ",query, " Q ", args, " A")
                    const adapter = new PrismaD1( context.env.DB, process.env.DEBUG)
                    const prisma = new PrismaClient({ adapter })
                    return prisma.dataChannel.findMany({...query})
                }
            }
        )
    );
    // builder.queryField('getDataChannel', (t) => t.prismaField({
    //         type: 'DataChannel',
    //         nullable: true,
    //         args: {
    //             organization: t.arg.string({required: true}),
    //             name: t.arg.string({required: true})
    //         },
    //         resolve: (query, root, args, {DB}) => {
    //             const filtered = d0Stub.filter(item => {
    //                 if (item.organization == args.organization && item.name == args.name) {
    //                     return true
    //                 }
    //
    //                 return false
    //             })
    //
    //             if (filtered.length == 1) {
    //                 return filtered[0]
    //             }
    //
    //             return undefined
    //
    //         }
    //     })
    // );
    //
    //
    // builder.mutationField(
    //     'upsertDataChannel', (t) => t.prismaField({
    //             type: 'DataChannel',
    //             args: {
    //                 organization: t.arg.string({required: true}),
    //                 name: t.arg.string({required: true}),
    //                 endpoint: t.arg.string({required: true})
    //             },
    //             resolve: (query, root, args, {DB}) => {
    //                 console.log(`upserting ${args.organization}/${args.name}@${args.endpoint}`)
    //                 const dc = new DataChannel(args.organization as string, args.name as string, args.endpoint as string)
    //
    //                 d0Stub.push(dc)
    //
    //                 return dc
    //             }
    //         }
    //     )
    // );
    // builder.mutationField(
    //     'deleteDataChannel', (t) => t.prismaField({
    //             type: 'DataChannel',
    //             nullable: true,
    //             args: {
    //                 organization: t.arg.string({required: true}),
    //                 name: t.arg.string({required: true}),
    //             },
    //             resolve: (query, root, args, {DB}) => {
    //                 let deleted: DataChannel | undefined = undefined;
    //                 const filtered: DataChannel[] = []
    //                 for (const e of d0Stub) {
    //                     if (e.organization == args.organization && e.name) {
    //                         deleted = e;
    //                     } else {
    //                         filtered.push(e);
    //                     }
    //                 }
    //
    //                 console.log("new set of dcs: ", d0Stub, filtered)
    //                 d0Stub = filtered
    //
    //                 return deleted
    //             }
    //         }
    //     )
    // );
 export default  builder.toSchema()
