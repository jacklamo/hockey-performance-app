import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { prisma } from '@/src/lib/prisma'

// This is your NextAuth configuration
export const authOptions: NextAuthOptions = {
  // Session strategy - we use JWT (token-based)
  session: {
    strategy: 'jwt',
  },
  
  // Custom pages (we'll build these later)
  pages: {
    signIn: '/auth/login',
  },
  
  // Providers - how users can authenticate
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      
      // This function runs when user tries to log in
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) {
          return null
        }
        const isPasswordValid = await compare(credentials.password, user.password)
        if (!isPasswordValid) {
          return null
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  
  // Callbacks - customize behavior
  callbacks: {
    // Add user id to JWT token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    
    // Add user id to session object
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)

// Export for Next.js App Router
export { handler as GET, handler as POST }