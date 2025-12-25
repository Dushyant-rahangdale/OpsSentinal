import { PrismaClient } from '@prisma/client'
import { queryMonitor } from './db-monitoring'

const prismaClientSingleton = () => {
    return new PrismaClient().$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const start = Date.now()
                    try {
                        const result = await query(args)
                        const duration = Date.now() - start
                        // console.log(`[Prisma Monitor] ${model}.${operation} took ${duration}ms`); // Debug log
                        queryMonitor.recordQuery(`${model}.${operation}`, duration, args)
                        return result
                    } catch (error) {
                        const duration = Date.now() - start
                        // Ensure error is properly typed for monitoring
                        const errorForMonitoring = error instanceof Error 
                            ? error 
                            : new Error(error ? String(error) : 'Unknown error occurred')
                        queryMonitor.recordQuery(`${model}.${operation}`, duration, args, errorForMonitoring)
                        throw error
                    }
                },
            },
        },
    })
}

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
    globalThis.prismaGlobal = prisma
}

export default prisma
