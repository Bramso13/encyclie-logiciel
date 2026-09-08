import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/nodemailer";
import { CABINET } from "@/lib/cabinet";
import { assertCronSecret } from "@/lib/cron-auth";
import { overdueThresholdActions } from "@/lib/quotes/overdue-threshold";

export async function GET(request: NextRequest) {
  const denied = assertCronSecret(request);
  if (denied) return denied;

  const now = new Date();
  const overdue = await prisma.paymentInstallment.findMany({
    where: {
      dueDate: { lt: now },
      status: { not: "PAID" },
    },
    include: {
      schedule: {
        include: {
          quote: {
            include: {
              broker: {
                select: { id: true, name: true, email: true },
              },
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  const byQuote = new Map<string, typeof overdue>();
  for (const item of overdue) {
    const quoteId = item.schedule.quoteId;
    const list = byQuote.get(quoteId) ?? [];
    list.push(item);
    byQuote.set(quoteId, list);
  }

  const counts: Record<string, number> = {};
  for (const [quoteId, items] of byQuote) {
    counts[quoteId] = items.length;
  }

  const flags = await prisma.overdueThresholdMail.findMany();
  const { toSend, toClear } = overdueThresholdActions(
    counts,
    flags.map((row) => row.quoteId),
  );

  let sent = 0;
  for (const quoteId of toSend) {
    const items = byQuote.get(quoteId) ?? [];
    const quote = items[0]?.schedule.quote;
    const broker = quote?.broker;
    if (!quote || !broker?.email) continue;

    const rows = items
      .map((item) => {
        const days = Math.floor(
          (now.getTime() - new Date(item.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return `<li>Échéance n°${item.installmentNumber} — ${item.amountTTC.toFixed(2)} € — échéance ${new Date(item.dueDate).toLocaleDateString("fr-FR")} — ${days} jour(s) de retard</li>`;
      })
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2>Retards de paiement — ${quote.reference}</h2>
        <p>Bonjour ${broker.name || ""},</p>
        <p>Le dossier <strong>${quote.reference}</strong> (${quote.product.name}) compte <strong>${items.length} échéances échues impayées</strong>.</p>
        <ul>${rows}</ul>
        <p>Merci de régulariser la situation dans les meilleurs délais.</p>
        <p style="color:#6b7280;font-size:12px">${CABINET.name} — ${CABINET.fullAddress} — ${CABINET.email} — ${CABINET.phone}</p>
      </div>
    `;
    const text = `Retards de paiement — ${quote.reference}\n${items.length} échéances échues impayées.`;

    await sendEmail(
      broker.email,
      `Retards de paiement (≥ 2 échéances) — ${quote.reference}`,
      html,
      text,
      {
        type: "PAYMENT_REMINDER",
        relatedQuoteId: quoteId,
        relatedUserId: broker.id,
        cc: CABINET.email,
      },
    );

    await prisma.overdueThresholdMail.create({
      data: {
        quoteId,
        overdueCount: items.length,
      },
    });
    sent += 1;
  }

  if (toClear.length > 0) {
    await prisma.overdueThresholdMail.deleteMany({
      where: { quoteId: { in: toClear } },
    });
  }

  return NextResponse.json({
    success: true,
    data: {
      scanned: overdue.length,
      dossiers: byQuote.size,
      sent,
      cleared: toClear.length,
    },
  });
}
