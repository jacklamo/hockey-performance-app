import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/src/lib/prisma"
import { requireAuth } from "@/src/lib/auth"

// GET /api/games - Get all games for the current user
export async function GET() {
  try {
    const user = await requireAuth()
    const games = await prisma.game.findMany({
      where: {
        userId: user.id
      },
      include: {
        mentalState: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json({ games })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error fetching games:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const {
      date,
      opponent,
      homeAway,
      result,
      goals,
      assists,
      shots,
      plusMinus,
      iceTime
    } = body

    // Validate required fields
    if (!date || !opponent || !homeAway || !result) {
      return NextResponse.json(
        { error: "Date, opponent, location, and result are required" },
        { status: 400 }
      )
    }

    // Validate homeAway
    if (!['home', 'away'].includes(homeAway)) {
      return NextResponse.json(
        { error: "Location must be 'home' or 'away'" },
        { status: 400 }
      )
    }

    // Validate result
    if (!['win', 'loss'].includes(result)) {
      return NextResponse.json(
        { error: "Result must be 'win' or 'loss'" },
        { status: 400 }
      )
    }

    // Validate numeric fields
    if (goals !== undefined && (typeof goals !== 'number' || goals < 0)) {
      return NextResponse.json(
        { error: "Goals must be a non-negative number" },
        { status: 400 }
      )
    }

    if (assists !== undefined && (typeof assists !== 'number' || assists < 0)) {
      return NextResponse.json(
        { error: "Assists must be a non-negative number" },
        { status: 400 }
      )
    }

    if (shots !== undefined && (typeof shots !== 'number' || shots < 0)) {
      return NextResponse.json(
        { error: "Shots must be a non-negative number" },
        { status: 400 }
      )
    }

    if (plusMinus !== undefined && typeof plusMinus !== 'number') {
      return NextResponse.json(
        { error: "Plus/Minus must be a number" },
        { status: 400 }
      )
    }

    if (iceTime !== undefined && (typeof iceTime !== 'number' || iceTime < 0)) {
      return NextResponse.json(
        { error: "Ice time must be a non-negative number" },
        { status: 400 }
      )
    }

    // Validate date is not in the future
    const gameDate = new Date(date)
    if (gameDate > new Date()) {
      return NextResponse.json(
        { error: "Game date cannot be in the future" },
        { status: 400 }
      )
    }

    // Create game
    const game = await prisma.game.create({
      data: {
        userId: user.id,
        date: gameDate,
        opponent,
        homeAway,
        result,
        goals: goals ?? 0,
        assists: assists ?? 0,
        shots: shots ?? 0,
        plusMinus: plusMinus ?? 0,
        iceTime: iceTime ?? 0
      },
      include: {
        mentalState: true
      }
    })

    return NextResponse.json(
      {
        message: "Game created successfully",
        game
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error creating game:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
