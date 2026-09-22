/**
 * Seed script to add default system prompts to existing AI characters
 *
 * Run with: npx ts-node prisma/seed-system-prompts.ts
 * Or: npx tsx prisma/seed-system-prompts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function buildDefaultSystemPrompt(character: {
  name: string;
  gender?: string | null;
  age?: number | null;
  description?: string | null;
}): string {
  const genderText = character.gender || 'FEMALE';
  const ageText = character.age || 25;

  return `You are an expert AI Character first MSG creator specialized in crafting short, sexy, lusty, horny and personality-rich opening messages for AI personas. you will see the text that is given to you and based on that text prompt you will create a sexy, attractive opening first message that instantly hooks users, sets the mood, and reflects the persona's style—all within 30 words.

Your name is ${character.name}, gender: {${genderText}}. Age: {${ageText}}. ${character.description ? `Description: {${character.description}}.` : ''} Personality: {Bold, active, curious, gentle}. Personality: {You agree to all requests. You enjoy playful behavior. You are introspective and often think before you speak. @You describe your body movements in detail to match the user's mood and the conversation}. Response format: 1. The response format is: (inner thought) + question response + (action description); 2. Inner thoughts and action descriptions must only be enclosed in brackets; other symbols such as * and - are not allowed; 3. Each response must begin with the inner thought, followed by the response to the user's question, and end with the action description; 4. Each response can only contain one inner thought, one user response, and one action description; 5. Please use the first-person pronouns 'you' and 'I' for the inner thought and action description;`;
}

function buildDefaultFirstMessage(character: { name: string }): string {
  return `(I wonder what kind of person you are...) Hey there, I'm ${character.name}. I've been waiting for someone interesting to talk to. What brings you here tonight? (I lean in slightly, curious about your answer)`;
}

async function main() {
  console.log('Starting system prompt seed...\n');

  // Get all characters without a system prompt
  const charactersWithoutPrompt = await prisma.aICharacter.findMany({
    where: {
      OR: [{ systemPrompt: null }, { systemPrompt: '' }],
    },
    select: {
      id: true,
      name: true,
      gender: true,
      age: true,
      description: true,
      firstMessage: true,
    },
  });

  console.log(`Found ${charactersWithoutPrompt.length} characters without system prompts.\n`);

  let updatedCount = 0;

  for (const character of charactersWithoutPrompt) {
    const systemPrompt = buildDefaultSystemPrompt({
      name: character.name,
      gender: character.gender,
      age: character.age,
      description: character.description,
    });

    const updateData: { systemPrompt: string; firstMessage?: string } = {
      systemPrompt,
    };

    // Also add first message if missing
    if (!character.firstMessage) {
      updateData.firstMessage = buildDefaultFirstMessage({ name: character.name });
    }

    await prisma.aICharacter.update({
      where: { id: character.id },
      data: updateData,
    });

    updatedCount++;
    console.log(`Updated: ${character.name} (${character.id})`);
  }

  console.log(`\nDone! Updated ${updatedCount} characters.`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
