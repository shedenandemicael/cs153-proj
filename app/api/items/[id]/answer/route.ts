import { NextRequest, NextResponse } from "next/server";
import { runAutonomousAgent } from "@/lib/agent";
import { applyAnswersToItemUpdate } from "@/lib/agent/apply-answers";
import type { AgentQuestion } from "@/lib/agent/types";
import { prisma } from "@/lib/db/prisma";
import { parseJsonArray, stringifyJson } from "@/lib/utils/json";
import { getErrorMessage, AppError } from "@/lib/utils/errors";
import type { AgentStepLog } from "@/lib/agent/types";

/** POST — answer agent clarifying questions and resume the run */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { answers?: Record<string, string> };
    const answers = body.answers ?? {};

    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    if (!item) throw new AppError("Item not found", 404);

    const latestRun = item.agentRuns[0];
    if (!latestRun || latestRun.status !== "awaiting_input") {
      throw new AppError("No pending agent questions for this item", 400);
    }

    const questions = parseJsonArray(latestRun.pendingQuestions) as AgentQuestion[];
    if (questions.length === 0) {
      throw new AppError("No pending questions found", 400);
    }

    for (const q of questions) {
      if (q.required && !answers[q.id]?.trim()) {
        throw new AppError(`Answer required: ${q.question}`, 400);
      }
    }

    const itemUpdates = applyAnswersToItemUpdate(answers, questions);
    const steps = JSON.parse(latestRun.steps) as AgentStepLog[];
    const awaitStep = steps.find((s) => s.id === "await_user_input" && s.status === "running");
    if (awaitStep) {
      awaitStep.status = "completed";
      awaitStep.message = "Seller provided answers — resuming agent.";
      awaitStep.at = new Date().toISOString();
    }

    await prisma.agentRun.update({
      where: { id: latestRun.id },
      data: {
        status: "completed",
        steps: stringifyJson(steps),
        pendingQuestions: null,
        completedAt: new Date(),
      },
    });

    await prisma.item.update({
      where: { id },
      data: {
        ...itemUpdates,
        status: "PROCESSING",
      },
    });

    const agentResult = await runAutonomousAgent(id);

    const full = await prisma.item.findUnique({
      where: { id },
      include: {
        images: true,
        listingDraft: true,
        comparables: true,
        evaluation: true,
        agentRuns: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });

    const status = agentResult.awaitingInput ? 200 : agentResult.success ? 200 : 422;
    return NextResponse.json({ item: full, agent: agentResult }, { status });
  } catch (error) {
    const status = error instanceof AppError ? error.statusCode : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
