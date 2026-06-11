import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

// Charge .env (tsx ne le fait pas automatiquement, contrairement au CLI Prisma).
try {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  process.env.DATABASE_URL ||= "file:./dev.db";
}

const db = new PrismaClient();
const rand = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(arr: T[]) => arr[rand(arr.length)];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

async function main() {
  console.log("🌱 Seed Luunch Mail…");

  // Repart de zéro pour un seed idempotent.
  await db.organization.deleteMany({});
  await db.user.deleteMany({});

  const passwordHash = hashPassword("demodemo");
  const user = await db.user.create({
    data: { email: "demo@luunchmail.io", name: "Camille Démo", passwordHash },
  });
  const org = await db.organization.create({
    data: { name: "Agence Démo", slug: "agence-demo", whiteLabelDomain: null, brandColor: "#22C55E" },
  });
  const ws = await db.workspace.create({
    data: { name: "Agence Démo", slug: "agence-demo-ws", orgId: org.id, region: "eu" },
  });
  await db.membership.create({ data: { userId: user.id, workspaceId: ws.id, role: "owner" } });
  const wid = ws.id;

  const period = new Date().toISOString().slice(0, 7);
  await db.usageCounter.createMany({
    data: [
      { workspaceId: wid, period, metric: "emails_sent", used: 0, quota: 150_000 },
      { workspaceId: wid, period, metric: "contacts", used: 0, quota: 100_000 },
      { workspaceId: wid, period, metric: "ai_credits", used: 38, quota: 500 },
      { workspaceId: wid, period, metric: "verifications", used: 240, quota: 10_000 },
    ],
  });

  // ---- Domaines + DNS ----
  const domainsData = [
    { name: "get-acme.com", status: "verified" },
    { name: "try-acme.io", status: "verified" },
    { name: "acme-mail.co", status: "pending" },
  ];
  const domains = [];
  for (const d of domainsData) {
    const domain = await db.domain.create({
      data: {
        workspaceId: wid, name: d.name, status: d.status, provider: "cloudflare", region: "eu",
        dkimSelector: "gm1", dkimPublicKey: "v=DKIM1; k=rsa; p=MIGfMA0GCSq…(démo)",
        trackingCname: `track.${d.name}`, verifiedAt: d.status === "verified" ? daysAgo(20) : null,
      },
    });
    const recs = [
      { type: "MX", host: "@", value: "mx.luunchmail.io", priority: 10, purpose: "mx" },
      { type: "TXT", host: "@", value: "v=spf1 include:_spf.luunchmail.io ~all", purpose: "spf" },
      { type: "TXT", host: "gm1._domainkey", value: "v=DKIM1; k=rsa; p=MIGf…", purpose: "dkim" },
      { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@luunchmail.io", purpose: "dmarc" },
      { type: "CNAME", host: "track", value: "tracking.luunchmail.io", purpose: "tracking" },
    ];
    await db.dnsRecord.createMany({
      data: recs.map((r) => ({ ...r, domainId: domain.id, status: d.status === "verified" ? "verified" : "pending" })),
    });
    domains.push(domain);
  }

  // ---- IP pools ----
  await db.ipPool.createMany({
    data: [
      { workspaceId: wid, name: "Pool partagé EU", type: "shared", region: "eu", status: "active", reputationScore: 94 },
      { workspaceId: wid, name: "IP dédiée #1", type: "dedicated", region: "eu", ipAddress: "185.12.44.10", status: "warming", reputationScore: 78, autoWarmup: true },
    ],
  });

  // ---- Mailboxes ----
  const mbConfigs = [
    { email: "camille@get-acme.com", provider: "gmail", status: "active", rep: 96, stage: 28 },
    { email: "leo@get-acme.com", provider: "gmail", status: "active", rep: 91, stage: 25 },
    { email: "sophie@try-acme.io", provider: "outlook", status: "warming", rep: 74, stage: 8 },
    { email: "marc@try-acme.io", provider: "outlook", status: "warming", rep: 68, stage: 5 },
    { email: "contact@acme-mail.co", provider: "smtp", status: "paused", rep: 61, stage: 12 },
    { email: "hello@get-acme.com", provider: "gmail", status: "active", rep: 88, stage: 22 },
  ];
  const mailboxes = [];
  for (const m of mbConfigs) {
    const domain = domains.find((d) => m.email.endsWith(d.name));
    const mb = await db.mailbox.create({
      data: {
        workspaceId: wid, domainId: domain?.id, email: m.email, displayName: m.email.split("@")[0],
        provider: m.provider, status: m.status, dailyLimit: 45, sentToday: rand(20),
        warmupEnabled: m.status !== "paused", warmupStage: m.stage, reputationScore: m.rep,
      },
    });
    // 14 jours de warmup
    for (let i = 13; i >= 0; i--) {
      const target = Math.min((m.stage - i > 0 ? m.stage - i : 1) * 2, 45);
      await db.warmupActivity.create({
        data: {
          mailboxId: mb.id, date: daysAgo(i),
          sent: target, opened: Math.round(target * 0.85), replied: Math.round(target * 0.2),
          savedFromSpam: Math.round(target * 0.05), reputationScore: Math.max(50, m.rep - i),
        },
      });
    }
    mailboxes.push(mb);
  }

  // ---- Contacts ----
  const firstNames = ["Julie", "Thomas", "Emma", "Lucas", "Léa", "Hugo", "Chloé", "Nathan", "Manon", "Louis", "Sarah", "Jules", "Inès", "Adam", "Camille"];
  const lastNames = ["Martin", "Bernard", "Dubois", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Garcia"];
  const companies = ["Nova SAS", "Pixel Studio", "GreenTech", "Bistronomie", "DataFlow", "UrbanWear", "Cloudly", "Maison Belle", "FitClub", "Voyageo"];
  const contactStatuses = ["subscribed", "subscribed", "subscribed", "subscribed", "unsubscribed", "bounced"];
  const contacts = [];
  for (let i = 0; i < 140; i++) {
    const fn = pick(firstNames), ln = pick(lastNames), co = pick(companies);
    const slug = co.toLowerCase().replace(/[^a-z]/g, "");
    const c = await db.contact.create({
      data: {
        workspaceId: wid,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@${slug}.com`,
        firstName: fn, lastName: ln, company: co,
        status: pick(contactStatuses),
        attributes: JSON.stringify({ plan: pick(["free", "pro", "enterprise"]), city: pick(["Paris", "Lyon", "Lille", "Nantes"]) }),
        consentSource: pick(["form", "import", "api", "checkout"]),
        consentAt: daysAgo(rand(120)),
        doubleOptIn: Math.random() > 0.4,
        engagementScore: rand(100),
        predictedClv: Math.round(rand(2000) + 50),
        churnRisk: Math.round(Math.random() * 100) / 100,
        createdAt: daysAgo(rand(180)),
      },
    });
    contacts.push(c);
  }
  await db.usageCounter.updateMany({ where: { workspaceId: wid, period, metric: "contacts" }, data: { used: contacts.length } });

  // ---- Listes & segments ----
  const list1 = await db.contactList.create({ data: { workspaceId: wid, name: "Newsletter", type: "static" } });
  const list2 = await db.contactList.create({ data: { workspaceId: wid, name: "Clients VIP", type: "static" } });
  for (const c of contacts.slice(0, 90)) await db.contactListMembership.create({ data: { listId: list1.id, contactId: c.id } });
  for (const c of contacts.slice(0, 25)) await db.contactListMembership.create({ data: { listId: list2.id, contactId: c.id } });

  await db.segment.createMany({
    data: [
      { workspaceId: wid, name: "Engagés (score > 60)", definition: JSON.stringify({ match: "all", conditions: [{ field: "engagementScore", op: "gt", value: 60 }] }), matchCount: contacts.filter((c) => c.engagementScore > 60).length },
      { workspaceId: wid, name: "Risque de churn élevé", definition: JSON.stringify({ match: "all", conditions: [{ field: "churnRisk", op: "gt", value: 0.7 }] }), matchCount: contacts.filter((c) => (c.churnRisk ?? 0) > 0.7).length },
      { workspaceId: wid, name: "Plan Pro", definition: JSON.stringify({ match: "all", conditions: [{ field: "attr:plan", op: "equals", value: "pro" }] }), matchCount: 0 },
    ],
  });

  // ---- Formulaires ----
  await db.form.createMany({
    data: [
      { workspaceId: wid, name: "Pop-up Bienvenue -10%", type: "popup", status: "live", views: 4210, submissions: 612, doubleOptIn: true, fields: JSON.stringify([{ name: "email", required: true }, { name: "firstName" }]) },
      { workspaceId: wid, name: "Landing Webinaire", type: "landing", status: "live", views: 1820, submissions: 295, doubleOptIn: false, fields: JSON.stringify([{ name: "email", required: true }, { name: "company" }]) },
    ],
  });

  // ---- Templates ----
  await db.template.createMany({
    data: [
      { workspaceId: wid, name: "Bienvenue", kind: "drag", category: "welcome", subject: "Bienvenue chez {{company}} 🎉", design: JSON.stringify({ blocks: [{ type: "heading", text: "Bienvenue !" }, { type: "text", text: "Merci de nous rejoindre." }, { type: "button", text: "Découvrir", url: "#" }, { type: "unsubscribe" }] }) },
      { workspaceId: wid, name: "Reset mot de passe", kind: "react_email", category: "transactional", subject: "Réinitialisez votre mot de passe", reactSource: "export default function ResetEmail({url}){return (<Html><Button href={url}>Réinitialiser</Button></Html>)}" },
      { workspaceId: wid, name: "Newsletter Mensuelle", kind: "drag", category: "newsletter", subject: "Les nouveautés du mois ✨", design: JSON.stringify({ blocks: [{ type: "image" }, { type: "heading", text: "Au programme" }, { type: "text" }, { type: "unsubscribe" }] }) },
      { workspaceId: wid, name: "Promo Black Friday", kind: "html", category: "promo", subject: "-40% pendant 48h ⏳", html: "<h1>Black Friday</h1><p>-40% sur tout.</p>" },
    ],
  });

  // ---- Suppression / blacklist / placement / vérif ----
  await db.suppressionEntry.createMany({
    data: contacts.filter((c) => c.status !== "subscribed").slice(0, 8).map((c) => ({
      workspaceId: wid, email: c.email, reason: c.status === "bounced" ? "bounce" : "unsubscribe",
    })),
  });
  await db.blacklistCheck.createMany({
    data: [
      { workspaceId: wid, target: "get-acme.com", listsChecked: 8, listedOn: "[]", status: "clean" },
      { workspaceId: wid, target: "185.12.44.10", listsChecked: 8, listedOn: JSON.stringify(["bl.spamcop.net"]), status: "listed" },
    ],
  });
  await db.placementTest.create({
    data: {
      workspaceId: wid, name: "Test pré-campagne Q2", status: "done", inboxPct: 88, promotionsPct: 7, spamPct: 5, spamScore: 1.4,
      providerResults: JSON.stringify({ gmail: { inbox: 90, promotions: 6, spam: 4 }, outlook: { inbox: 84, promotions: 8, spam: 8 }, yahoo: { inbox: 88, promotions: 7, spam: 5 } }),
      recommendations: JSON.stringify(["Placement sain — augmentez le volume progressivement"]),
    },
  });
  for (let i = 0; i < 12; i++) {
    await db.emailVerification.create({
      data: { workspaceId: wid, email: pick(contacts).email, result: pick(["valid", "valid", "valid", "risky", "catch_all", "invalid"]), score: rand(100) },
    });
  }

  // ---- Clés API & webhooks ----
  await db.apiKey.createMany({
    data: [
      { workspaceId: wid, name: "Production", prefix: "gm_live_a1b2c3", hash: "demo-hash-1", scopes: JSON.stringify(["emails:send", "contacts:write"]), lastUsedAt: daysAgo(0) },
      { workspaceId: wid, name: "Intégration Zapier", prefix: "gm_live_z9y8x7", hash: "demo-hash-2", scopes: JSON.stringify(["emails:send"]), lastUsedAt: daysAgo(3) },
    ],
  });
  await db.webhookEndpoint.create({
    data: { workspaceId: wid, url: "https://hooks.acme.com/gigamail", secret: "whsec_demo123", events: JSON.stringify(["delivered", "opened", "clicked", "bounced", "complained"]), status: "active" },
  });

  // ---- Campagnes (outreach) ----
  const camp1 = await db.campaign.create({
    data: {
      workspaceId: wid, name: "Prospection agences SaaS", type: "outreach", status: "running",
      subject: "Une idée pour {{company}}", mailboxRotation: true, espMatching: true, abTesting: true,
      stats: JSON.stringify({ sent: 420, delivered: 408, opened: 196, clicked: 44, replied: 18, bounced: 12 }),
    },
  });
  await db.sequenceStep.createMany({
    data: [
      { campaignId: camp1.id, order: 0, type: "email", subject: "Une idée pour {{company}}", body: "Bonjour {{first_name}},\n\n{Je suis tombé sur|J'ai découvert} {{company}} et je pense qu'on peut vous aider à scaler votre prospection.\n\nOuvert à un échange ?" },
      { campaignId: camp1.id, order: 1, type: "wait", waitDays: 3 },
      { campaignId: camp1.id, order: 2, type: "email", subject: "Re: Une idée pour {{company}}", body: "Bonjour {{first_name}}, je me permets de relancer — 15 minutes cette semaine ?" },
    ],
  });
  const camp2 = await db.campaign.create({
    data: {
      workspaceId: wid, name: "Relance e-commerce DACH", type: "outreach", status: "completed",
      subject: "Question rapide", stats: JSON.stringify({ sent: 310, delivered: 301, opened: 132, clicked: 28, replied: 11, bounced: 9 }),
    },
  });
  await db.sequenceStep.create({ data: { campaignId: camp2.id, order: 0, type: "email", subject: "Question rapide", body: "Bonjour {{first_name}}…" } });

  // Broadcast marketing
  const broadcast = await db.campaign.create({
    data: {
      workspaceId: wid, name: "Newsletter Juin", type: "broadcast", status: "completed", subject: "Les nouveautés de juin ✨",
      sendTimeOpt: true, stats: JSON.stringify({ sent: 90, delivered: 89, opened: 41, clicked: 12, bounced: 1 }),
    },
  });

  // Enrollments pour camp1
  for (const c of contacts.filter((c) => c.status === "subscribed").slice(0, 30)) {
    await db.enrollment.create({
      data: { campaignId: camp1.id, contactId: c.id, mailboxId: pick(mailboxes).id, currentStep: rand(3), status: pick(["active", "active", "replied", "completed"]), nextActionAt: daysAgo(-1) },
    });
  }

  // ---- Flows ----
  await db.flow.createMany({
    data: [
      {
        workspaceId: wid, name: "Bienvenue (welcome series)", status: "live",
        trigger: JSON.stringify({ type: "list_subscribed", listName: "Newsletter" }),
        nodes: JSON.stringify([
          { id: "t", type: "trigger", label: "Inscription Newsletter" },
          { id: "e1", type: "email", label: "E-mail de bienvenue" },
          { id: "w1", type: "wait", label: "Attendre 2 jours" },
          { id: "c1", type: "condition", label: "A ouvert ?" },
          { id: "e2", type: "email", label: "E-mail offre -10%" },
        ]),
        goal: JSON.stringify({ type: "conversion", event: "purchase" }),
        stats: JSON.stringify({ entered: 612, completed: 488, revenue: 8420 }),
      },
      {
        workspaceId: wid, name: "Panier abandonné", status: "draft",
        trigger: JSON.stringify({ type: "cart_abandoned" }),
        nodes: JSON.stringify([
          { id: "t", type: "trigger", label: "Panier abandonné" },
          { id: "w1", type: "wait", label: "Attendre 1 h" },
          { id: "e1", type: "email", label: "Rappel panier" },
        ]),
        stats: JSON.stringify({ entered: 0, completed: 0, revenue: 0 }),
      },
    ],
  });

  // ---- Messages + events (14 jours) pour alimenter analytics ----
  const subscribed = contacts.filter((c) => c.status === "subscribed");
  let totalSent = 0;
  for (let day = 13; day >= 0; day--) {
    const count = 8 + rand(14);
    for (let k = 0; k < count; k++) {
      const c = pick(subscribed);
      const created = new Date(daysAgo(day).getTime() + rand(86400_000));
      const source = pick(["outreach", "outreach", "broadcast", "transactional"]);
      const campaignId = source === "broadcast" ? broadcast.id : source === "outreach" ? pick([camp1.id, camp2.id]) : null;
      const events: { type: string; occurredAt: Date }[] = [
        { type: "queued", occurredAt: created },
        { type: "sent", occurredAt: created },
      ];
      let status = "sent";
      const roll = Math.random();
      if (roll < 0.02) {
        events.push({ type: "bounced", occurredAt: created });
        status = "bounced";
      } else {
        events.push({ type: "delivered", occurredAt: new Date(created.getTime() + 4000) });
        status = "delivered";
        if (Math.random() < 0.46) {
          events.push({ type: "opened", occurredAt: new Date(created.getTime() + 600_000) });
          status = "opened";
          if (Math.random() < 0.25) {
            events.push({ type: "clicked", occurredAt: new Date(created.getTime() + 900_000) });
            status = "clicked";
          }
        }
      }
      await db.emailMessage.create({
        data: {
          workspaceId: wid, source, campaignId, contactId: c.id,
          fromEmail: pick(mailboxes).email, toEmail: c.email,
          subject: source === "broadcast" ? "Les nouveautés de juin ✨" : "Une idée pour " + c.company,
          status, sentAt: created, createdAt: created, providerId: `demo_${day}_${k}`,
          events: { create: events },
        },
      });
      totalSent++;
    }
  }
  await db.usageCounter.updateMany({ where: { workspaceId: wid, period, metric: "emails_sent" }, data: { used: totalSent } });

  // ---- Inbox unifiée ----
  const inboxSamples = [
    { cat: "interested", body: "Bonjour, oui ça m'intéresse — pouvez-vous proposer un créneau cette semaine ?" },
    { cat: "interested", body: "Intéressant ! Quels sont vos tarifs pour une équipe de 10 ?" },
    { cat: "not_interested", body: "Merci mais ce n'est pas une priorité pour le moment." },
    { cat: "ooo", body: "Je suis absent jusqu'au 20, je reviendrai vers vous à mon retour." },
    { cat: "interested", body: "On peut en discuter. Êtes-vous dispo jeudi 14h ?" },
    { cat: "neutral", body: "Pouvez-vous m'envoyer plus d'informations par écrit ?" },
  ];
  for (let i = 0; i < inboxSamples.length; i++) {
    const c = pick(subscribed);
    const mb = pick(mailboxes);
    const thread = await db.inboxThread.create({
      data: {
        workspaceId: wid, contactId: c.id, mailboxId: mb.id, campaignId: camp1.id,
        subject: `Re: Une idée pour ${c.company}`, category: inboxSamples[i].cat, status: "open",
        lastMessageAt: daysAgo(rand(5)),
      },
    });
    await db.inboxMessage.createMany({
      data: [
        { threadId: thread.id, direction: "outbound", fromEmail: mb.email, toEmail: c.email, body: `Bonjour ${c.firstName}, une idée pour ${c.company}…` },
        { threadId: thread.id, direction: "inbound", fromEmail: c.email, toEmail: mb.email, body: inboxSamples[i].body },
      ],
    });
  }

  console.log(`✅ Seed terminé. ${totalSent} e-mails, ${contacts.length} contacts, ${mailboxes.length} boîtes.`);
  console.log("➡️  Connexion démo : demo@luunchmail.io / demodemo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
