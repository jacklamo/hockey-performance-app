import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/src/lib/prisma"
import { requireAuth } from "@/src/lib/auth"

// GET /api/games/[id] - Get a specific game
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    const game = await prisma.game.findUnique({
      where: {
        id
      },
      include: {
        mentalState: true
      }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    // Verify the game belongs to the current user
    if (game.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    return NextResponse.json({ game })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error fetching game:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/games/[id] - Update a game
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params
    const body = await request.json()

    // Check if game exists and belongs to user
    const existingGame = await prisma.game.findUnique({
      where: { id }
    })

    if (!existingGame) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (existingGame.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

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

    // Validate homeAway if provided
    if (homeAway && !['home', 'away'].includes(homeAway)) {
      return NextResponse.json(
        { error: "Location must be 'home' or 'away'" },
        { status: 400 }
      )
    }

    // Validate result if provided
    if (result && !['win', 'loss'].includes(result)) {
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

    // Validate date is not in the future if provided
    let gameDate
    if (date) {
      gameDate = new Date(date)
      if (gameDate > new Date()) {
        return NextResponse.json(
          { error: "Game date cannot be in the future" },
          { status: 400 }
        )
      }
    }

    // Update game
    const game = await prisma.game.update({
      where: { id },
      data: {
        ...(date && { date: gameDate }),
        ...(opponent && { opponent }),
        ...(homeAway && { homeAway }),
        ...(result && { result }),
        ...(goals !== undefined && { goals }),
        ...(assists !== undefined && { assists }),
        ...(shots !== undefined && { shots }),
        ...(plusMinus !== undefined && { plusMinus }),
        ...(iceTime !== undefined && { iceTime })
      },
      include: {
        mentalState: true
      }
    })

    return NextResponse.json({
      message: "Game updated successfully",
      game
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error updating game:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/games/[id] - Delete a game
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = params

    // Check if game exists and belongs to user
    const existingGame = await prisma.game.findUnique({
      where: { id }
    })

    if (!existingGame) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (existingGame.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Delete game (mental state will be cascade deleted)
    await prisma.game.delete({
      where: { id }
    })

    return NextResponse.json({
      message: "Game deleted successfully"
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error deleting game:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
