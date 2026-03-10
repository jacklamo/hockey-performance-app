import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/src/lib/prisma"
import { hashPassword } from "@/src/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name, team, position } = body

    // Validate required fields
    if (!email || !password || !name || !team || !position) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    // Validate position
    const validPositions = ["Center", "Left Wing", "Right Wing", "Defenseman", "Goalie"]
    if (!validPositions.includes(position)) {
      return NextResponse.json(
        { error: "Invalid position" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        team,
        position
      },
      select: {
        id: true,
        email: true,
        name: true,
        team: true,
        position: true,
        createdAt: true
      }
    })

    return NextResponse.json(
      {
        message: "User created successfully",
        user
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}