import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { getPolicesV2 } from "../src/lib/bordereau/extractPolicesV2";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatch(
  name: string,
  pool: { raw: string; n: string }[],
): string | null {
  const n = norm(name);
  if (!n) return null;
  let m = pool.find((p) => p.n === n);
  if (m) return m.raw;
  m = pool.find((p) => p.n.includes(n) || n.includes(p.n));
  if (m) return m.raw;
  const words = n.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return null;
  const hit = pool.filter((p) => {
    const matched = words.filter((w) => p.n.includes(w)).length;
    return (
      matched >= Math.min(2, words.length) ||
      (words.length === 1 && matched === 1)
    );
  });
  if (hit.length === 1) return hit[0].raw;
  if (hit.length > 1) {
    return hit.sort(
      (a, b) => Math.abs(a.n.length - n.length) - Math.abs(b.n.length - n.length),
    )[0].raw;
  }
  return null;
}

async function main() {
  const prisma = new PrismaClient();
  const start = new Date("2026-01-01T00:00:00.000Z");
  const end = new Date("2026-02-01T00:00:00.000Z");

  const expectedRaw = readFileSync("test-bord.txt", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = await getPolicesV2(
    { dateRange: { startDate: start, endDate: end } },
    prisma,
  );
  const bdxNames = [
    ...new Set(rows.map((r) => r.NOM_ENTREPRISE_ASSURE?.trim()).filter(Boolean)),
  ];
  const bdxNorm = bdxNames.map((n) => ({ raw: n, n: norm(n) }));
  const expNorm = expectedRaw.map((e) => ({ raw: e, n: norm(e) }));

  const missingList = expectedRaw.filter((e) => !findMatch(e, bdxNorm));
  const extraList = bdxNames.filter((b) => !findMatch(b, expNorm));

  console.log("=== RÉSUMÉ janvier 2026 ===");
  console.log("Liste test-bord.txt:", expectedRaw.length, "entreprises");
  console.log("Bordereau:", rows.length, "lignes,", bdxNames.length, "entreprises uniques");
  console.log("\nMANQUANTES dans le bordereau (" + missingList.length + "):");
  for (const m of missingList) console.log(" -", m);

  console.log("\nEN TROP dans le bordereau (" + extraList.length + "):");
  for (const e of extraList) console.log(" -", e);

  // Détail des manquantes
  const searches = [
    "MARECHAL",
    "CAM CHARPENTE",
    "SOLAR PLUS",
    "DJAMRAKANI",
  ];
  console.log("\n=== Détail échéances (4 manquantes) ===");
  for (const q of searches) {
    const insts = await prisma.paymentInstallment.findMany({
      where: {
        schedule: {
          quote: {
            formData: {
              path: ["companyName"],
              string_contains: q,
              mode: "insensitive",
            },
          },
        },
      },
      include: {
        schedule: {
          include: { quote: { select: { reference: true, formData: true } } },
        },
      },
      orderBy: { installmentNumber: "asc" },
    });
    const fd = insts[0]?.schedule?.quote?.formData as Record<string, unknown>;
    console.log("\n", fd?.companyName);
    for (const i of insts) {
      const inJan = (d: Date | null) => (d ? d >= start && d < end : false);
      console.log(
        `  ech.${i.installmentNumber} periodStart=${i.periodStart.toISOString().slice(0, 10)} psJan=${inJan(i.periodStart)} emission=${i.emissionDate?.toISOString().slice(0, 10) ?? "—"} emJan=${inJan(i.emissionDate)} paid=${i.paidAt?.toISOString().slice(0, 10) ?? "—"} paidJan=${inJan(i.paidAt)}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
