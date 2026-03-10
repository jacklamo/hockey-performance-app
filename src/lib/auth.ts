import { getServerSession } from "next-auth"
import { authOptions } from '../../app/api/auth/[...nextauth]/route'
import { hash } from 'bcryptjs'

export async function getCurrentUser() {
    try {
        const session = await getServerSession(authOptions)
        return session?.user
    } catch (error) {
        console.warn("Error getting session:", error)
        return undefined
    }
}

export async function requireAuth() {
    const user = await getCurrentUser()
    if (!user) {
        throw new Error('Unauthorized')
    }
    return user
}

export async function hashPassword(password:string) {
    return await hash(password, 10)
}

export { compare as verifyPassword} from 'bcryptjs'