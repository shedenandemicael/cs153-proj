import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { BatchProgress } from "@/components/items/BatchProgress";

export const dynamic = "force-dynamic";

export default async function BatchStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const batch = await prisma.batch.findUnique({ where: { id } });
  if (!batch) notFound();

  return (
    <div>
      <Link href="/items/batch" className="text-sm text-blue-600 hover:underline">
        ← New batch
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Batch #{id.slice(0, 8)}</h1>
      <p className="mt-1 mb-6 text-slate-600">
        {batch.totalItems} item{batch.totalItems === 1 ? "" : "s"} in this batch
      </p>
      <BatchProgress batchId={id} />
    </div>
  );
}
