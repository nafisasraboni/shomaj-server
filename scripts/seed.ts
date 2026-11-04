import { ensureIndexes, eventsCollection, withDatabase } from "../src/db";
import type { EventDocument, EventType } from "../src/models";

const samples: Array<{ title: string; description: string; eventType: EventType; thumbnailUrl: string; location: string; daysFromNow: number }> = [
  { title: "Winter Clothes Distribution in Mirpur", description: "Help sort, package, and distribute warm clothing to families who need extra support during the colder weeks.", eventType: "Donation", thumbnailUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=85", location: "Mirpur 10, Dhaka", daysFromNow: 8 },
  { title: "Buriganga Riverside Cleanup", description: "Join local volunteers to collect plastic waste, separate recyclables, and restore a cleaner stretch of the riverbank.", eventType: "Cleanup", thumbnailUrl: "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1200&q=85", location: "Sadarghat, Dhaka", daysFromNow: 13 },
  { title: "Schoolyard Tree Planting Day", description: "Plant native shade trees with students and teachers, then prepare simple care plans for the coming summer months.", eventType: "Plantation", thumbnailUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=85", location: "Uttara Sector 7, Dhaka", daysFromNow: 17 },
  { title: "Community Health Screening Camp", description: "Support doctors and organisers with registration, queue management, basic awareness materials, and family guidance.", eventType: "Healthcare", thumbnailUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=85", location: "Agrabad, Chattogram", daysFromNow: 22 },
  { title: "Weekend Reading Circle for Children", description: "Read stories, lead creative exercises, and help primary-school learners grow confidence in a welcoming group setting.", eventType: "Education", thumbnailUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=85", location: "Zindabazar, Sylhet", daysFromNow: 29 },
  { title: "Blanket Distribution in Mohammadpur", description: "Prepare and deliver warm blankets with a coordinated volunteer team while keeping distribution respectful and organised.", eventType: "Relief", thumbnailUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1200&q=85", location: "Mohammadpur, Dhaka", daysFromNow: 35 },
  { title: "Street Animal Care and Feeding", description: "Work with local rescuers to prepare food, identify animals needing treatment, and share responsible care information.", eventType: "Animal Welfare", thumbnailUrl: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=85", location: "Khulna City Centre", daysFromNow: 41 },
  { title: "Coastal Family Relief Packing", description: "Pack essential food, hygiene, and water-safety supplies for families facing seasonal hardship in coastal communities.", eventType: "Relief", thumbnailUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=85", location: "Barishal Sadar", daysFromNow: 48 },
];

async function seed() {
  await withDatabase(async (database) => {
    await ensureIndexes(database);
    const collection = eventsCollection(database);
    await collection.deleteMany({ "createdBy.userId": "seed-shomaj" });
    const now = new Date();
    const events: EventDocument[] = samples.map(({ daysFromNow, ...sample }) => ({
      ...sample,
      eventDate: new Date(now.getTime() + daysFromNow * 86_400_000),
      createdBy: { userId: "seed-shomaj", email: "hello@shomaj.community", name: "Shomaj Community", image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=300&q=80" },
      participantCount: 0,
      createdAt: now,
      updatedAt: now,
    }));
    await collection.insertMany(events);
    console.log(`Seeded ${events.length} upcoming events.`);
  });
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});
