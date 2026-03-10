import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/src/lib/prisma"
import { requireAuth } from "@/src/lib/auth"

// POST /api/games/[id]/mental - Create or update mental state for a game
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: gameId } = params
    const body = await request.json()

    // Check if game exists and belongs to user
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { mentalState: true }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (game.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const {
      confidence,
      sleepHours,
      sleepQuality,
      stressLevel,
      physicalEnergy,
      notes
    } = body

    // Validate required fields
    if (
      confidence === undefined ||
      sleepHours === undefined ||
      sleepQuality === undefined ||
      stressLevel === undefined ||
      physicalEnergy === undefined
    ) {
      return NextResponse.json(
        { error: "All mental state fields except notes are required" },
        { status: 400 }
      )
    }

    // Validate confidence (1-10)
    if (typeof confidence !== 'number' || confidence < 1 || confidence > 10) {
      return NextResponse.json(
        { error: "Confidence must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Validate sleepHours (0-24)
    if (typeof sleepHours !== 'number' || sleepHours < 0 || sleepHours > 24) {
      return NextResponse.json(
        { error: "Sleep hours must be between 0 and 24" },
        { status: 400 }
      )
    }

    // Validate sleepQuality (1-10)
    if (typeof sleepQuality !== 'number' || sleepQuality < 1 || sleepQuality > 10) {
      return NextResponse.json(
        { error: "Sleep quality must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Validate stressLevel (1-10)
    if (typeof stressLevel !== 'number' || stressLevel < 1 || stressLevel > 10) {
      return NextResponse.json(
        { error: "Stress level must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Validate physicalEnergy (1-10)
    if (typeof physicalEnergy !== 'number' || physicalEnergy < 1 || physicalEnergy > 10) {
      return NextResponse.json(
        { error: "Physical energy must be between 1 and 10" },
        { status: 400 }
      )
    }

    // Validate notes length if provided
    if (notes && typeof notes === 'string' && notes.length > 500) {
      return NextResponse.json(
        { error: "Notes must be 500 characters or less" },
        { status: 400 }
      )
    }

    // Upsert mental state (create or update)
    const mentalState = await prisma.mentalState.upsert({
      where: {
        gameId
      },
      create: {
        gameId,
        confidence,
        sleepHours,
        sleepQuality,
        stressLevel,
        physicalEnergy,
        notes: notes || null
      },
      update: {
        confidence,
        sleepHours,
        sleepQuality,
        stressLevel,
        physicalEnergy,
        notes: notes || null
      }
    })

    return NextResponse.json(
      {
        message: game.mentalState ? "Mental state updated successfully" : "Mental state created successfully",
        mentalState
      },
      { status: game.mentalState ? 200 : 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error saving mental state:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/games/[id]/mental - Update mental state for a game
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id: gameId } = params
    const body = await request.json()

    // Check if game exists and belongs to user
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { mentalState: true }
    })

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      )
    }

    if (game.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    if (!game.mentalState) {
      return NextResponse.json(
        { error: "Mental state not found for this game" },
        { status: 404 }
      )
    }

    const {
      confidence,
      sleepHours,
      sleepQuality,
      stressLevel,
      physicalEnergy,
      notes
    } = body

    // Validate fields if provided
    if (confidence !== undefined && (typeof confidence !== 'number' || confidence < 1 || confidence > 10)) {
      return NextResponse.json(
        { error: "Confidence must be between 1 and 10" },
        { status: 400 }
      )
    }

    if (sleepHours !== undefined && (typeof sleepHours !== 'number' || sleepHours < 0 || sleepHours > 24)) {
      return NextResponse.json(
        { error: "Sleep hours must be between 0 and 24" },
        { status: 400 }
      )
    }

    if (sleepQuality !== undefined && (typeof sleepQuality !== 'number' || sleepQuality < 1 || sleepQuality > 10)) {
      return NextResponse.json(
        { error: "Sleep quality must be between 1 and 10" },
        { status: 400 }
      )
    }

    if (stressLevel !== undefined && (typeof stressLevel !== 'number' || stressLevel < 1 || stressLevel > 10)) {
      return NextResponse.json(
        { error: "Stress level must be between 1 and 10" },
        { status: 400 }
      )
    }

    if (physicalEnergy !== undefined && (typeof physicalEnergy !== 'number' || physicalEnergy < 1 || physicalEnergy > 10)) {
      return NextResponse.json(
        { error: "Physical energy must be between 1 and 10" },
        { status: 400 }
      )
    }

    if (notes !== undefined && typeof notes === 'string' && notes.length > 500) {
      return NextResponse.json(
        { error: "Notes must be 500 characters or less" },
        { status: 400 }
      )
    }

    // Update mental state
    const mentalState = await prisma.mentalState.update({
      where: {
        gameId
      },
      data: {
        ...(confidence !== undefined && { confidence }),
        ...(sleepHours !== undefined && { sleepHours }),
        ...(sleepQuality !== undefined && { sleepQuality }),
        ...(stressLevel !== undefined && { stressLevel }),
        ...(physicalEnergy !== undefined && { physicalEnergy }),
        ...(notes !== undefined && { notes: notes || null })
      }
    })

    return NextResponse.json({
      message: "Mental state updated successfully",
      mentalState
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.error("Error updating mental state:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
