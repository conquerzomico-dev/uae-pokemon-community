/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Trainer, Raid, ChatMessage, PokemonTeam, RaidTier, TrainerRole, PrivateMessage } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

// Set up mutable admin passcode which can be modified from dashboard
let currentAdminPasscode = "9999";

// Maximum payload size for base64 raid screenshots
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI Features will operate in fallback mock mode.");
}

interface DbState {
  trainers: Trainer[];
  raids: Raid[];
  chats: ChatMessage[];
  privateMessages: PrivateMessage[];
}

// In-Memory Database State
const db: DbState = {
  trainers: [
    {
      id: "seed-ahmed",
      name: "Ahmed",
      email: "ahmedfoox21@gmail.com",
      password: "0115855847",
      trainerCode: "2026 0603 1957",
      team: "VALOR" as const,
      level: 50,
      favoritePokemon: "Rayquaza",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150", // High contrast master profile pic
      joinedAt: new Date().toISOString(),
      roles: ["TRAINER", "TRADER", "ADMIN"]
    },
    {
      id: "seed-1",
      name: "DubaiRaiderDXB",
      email: "dubai@union.ae",
      password: "password",
      trainerCode: "8274 9102 3847",
      team: "MYSTIC" as const,
      level: 48,
      favoritePokemon: "Metagross",
      avatarUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150", // Colored backdrop
      joinedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      roles: ["TRAINER", "TRADER", "ADMIN"]
    },
    {
      id: "seed-2",
      name: "AbuDhabiApex",
      email: "abudhabi@union.ae",
      password: "password",
      trainerCode: "1093 8472 0592",
      team: "VALOR" as const,
      level: 45,
      favoritePokemon: "Rayquaza",
      avatarUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=150", 
      joinedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      roles: ["TRAINER", "TRADER"]
    },
    {
      id: "seed-3",
      name: "SharjahLegend",
      email: "sharjah@union.ae",
      password: "password",
      trainerCode: "4492 8810 3921",
      team: "INSTINCT" as const,
      level: 42,
      favoritePokemon: "Charizard",
      avatarUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150",
      joinedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      roles: ["TRAINER"]
    }
  ],
  raids: [
    {
      id: "raid-1",
      bossName: "Mewtwo",
      tier: "5-STAR" as const,
      cp: 54148,
      gymName: "Burj Khalifa Fountain Gym",
      locationDetails: "Near the main Dubai Mall boardwalk entrance",
      startTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Starts in 10 mins
      endTime: new Date(Date.now() + 55 * 60 * 1000).toISOString(),   // Active for 45 mins after
      photoUrl: "", // Optional base64
      creatorId: "seed-1",
      counters: "⚡ Shadow Tyranitar (Bite/Brutal Swing), Hydreigon (Dark Pulse), Chandelure (Shadow Ball). Weak to Ghost, Dark, and Bug.",
      strategy: "Requires at least 4-5 high-level trainers. Beware of Focus Blast Mewtwo (uses fighting, counters dark types!).",
      rsvps: [
        { trainerId: "seed-1", type: "IN_PERSON" as const, joinedAt: new Date().toISOString(), slotsCount: 1 },
        { trainerId: "seed-2", type: "REMOTE" as const, joinedAt: new Date().toISOString(), slotsCount: 2 } // bringing +1 remote
      ],
      createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      status: "APPROVED" as const
    },
    {
      id: "raid-2",
      bossName: "Mega Charizard Y",
      tier: "MEGA" as const,
      cp: 45780,
      gymName: "Sheikh Zayed Mosque Memorial Gym",
      locationDetails: "By the north pavilion library plaque",
      startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // Active now, started 15m ago
      endTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),  // Ends in 30 mins
      photoUrl: "",
      creatorId: "seed-2",
      counters: "🪨 Rhyperior (Rock Wrecker), Rampardos (Rock Slide), Terrakion. Extremely weak to ROCK types (double weakness x2.56 damage!).",
      strategy: "Easy duo! Two level 35+ players with strong Rock counters can complete this effortlessly.",
      rsvps: [
        { trainerId: "seed-2", type: "IN_PERSON" as const, joinedAt: new Date().toISOString(), slotsCount: 1 },
        { trainerId: "seed-3", type: "IN_PERSON" as const, joinedAt: new Date().toISOString(), slotsCount: 1 }
      ],
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      status: "APPROVED" as const
    }
  ],
  chats: [
    {
      id: "msg-1",
      channelId: "general",
      trainerId: "seed-1",
      senderName: "DubaiRaiderDXB",
      senderTeam: "MYSTIC" as const,
      content: "Marhaban UAE community! Welcome to our Poké-Union. Let's organize coordinates for Dubai, Abu Dhabi, & Sharjah here. Post your screenshots, the AI will parse them!",
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    },
    {
      id: "msg-2",
      channelId: "general",
      trainerId: "seed-2",
      senderName: "AbuDhabiApex",
      senderTeam: "VALOR" as const,
      content: "Haha, look at this! I walked 8km in the afternoon heat in Al Ain, my phone literally displayed a high temperature warning and then a Psyduck spawned wearing a sun hat. Accurate representation of me melting 🤣🥵",
      timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString()
    },
    {
      id: "msg-3",
      channelId: "general",
      trainerId: "seed-3",
      senderName: "SharjahLegend",
      senderTeam: "INSTINCT" as const,
      content: "Lol! Standard summer raiding across the Emirates. I usually play inside malls now. Just posted the Mega Charizard raid at Sheikh Zayed Mosque Memorial Gym if anyone is nearby!",
      timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      id: "msg-4",
      channelId: "trading",
      trainerId: "seed-1",
      senderName: "DubaiRaiderDXB",
      senderTeam: "MYSTIC" as const,
      content: "WTT: Got 2 extra Shiny Rayquaza from the raid hours. Looking for a Shiny Kyogre or Origin Forme Giratina. Can meet up around Dubai Mall or Jumeirah! ♻️",
      timestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
    },
    {
      id: "msg-5",
      channelId: "trading",
      trainerId: "seed-2",
      senderName: "AbuDhabiApex",
      senderTeam: "VALOR" as const,
      content: "I have that Shiny Kyogre! I am often in Abu Dhabi (Yas Island / Corniche), but I travel to Dubai on weekends. Let's coordinate and increase friend level first!",
      timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
    },
    // Raid-Specific Chat for Mewtwo
    {
      id: "msg-r1-1",
      channelId: "raid-raid-1",
      trainerId: "seed-1",
      senderName: "DubaiRaiderDXB",
      senderTeam: "MYSTIC" as const,
      content: "Salaam guys! Do we have remote invites for the Mewtwo raid at Burj Khalifa? I am sitting on the promenade with 2 local trainers, we need 3 more to take it down comfortably.",
      timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString()
    },
    {
      id: "msg-r1-2",
      channelId: "raid-raid-1",
      trainerId: "seed-2",
      senderName: "AbuDhabiApex",
      senderTeam: "VALOR" as const,
      content: "Count me in remotely! RSVP'd and adding you. Send invite when lobby timer hits 60s please! Yalla let's go!",
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ],
  privateMessages: []
};

// --- API ROUTES ---

// 1. Trainer Routes
app.get("/api/trainers", (req, res) => {
  res.json(db.trainers);
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required to sign in." });
  }

  const matchedTrainer = db.trainers.find(t => t.email && t.email.trim().toLowerCase() === email.trim().toLowerCase());

  if (!matchedTrainer) {
    return res.status(404).json({ error: "No registered Trainer found matching this email address." });
  }

  if (matchedTrainer.password !== password) {
    return res.status(401).json({ error: "Incorrect password. Please try again." });
  }

  if (matchedTrainer.isBanned) {
    return res.status(403).json({ error: "This trainer profile is currently BANNED from the club." });
  }

  res.json({ success: true, trainer: matchedTrainer });
});

app.post("/api/trainers", (req, res) => {
  const { id, name, trainerCode, team, level, favoritePokemon, avatarUrl, email, password } = req.body;

  if (!name || !trainerCode || !team || !email || !password) {
    return res.status(400).json({ error: "Missing required fields: name, trainerCode, team, email, password" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingIndex = db.trainers.findIndex(t => t.id === id);
  const existingTrainer = existingIndex !== -1 ? db.trainers[existingIndex] : null;

  // Validate duplicate email
  const emailDup = db.trainers.find(t => t.email && t.email.trim().toLowerCase() === cleanEmail);
  if (emailDup && (!existingTrainer || emailDup.id !== existingTrainer.id)) {
    return res.status(400).json({ error: "A trainer is already registered with this email address." });
  }

  // Validate level (max 80)
  const numLevel = Math.max(1, Math.min(80, Number(level) || 30));

  // Preserve banned status
  const isBanned = existingTrainer ? !!existingTrainer.isBanned : false;

  // Roles can only be updated from admin panel. Default to ['TRAINER'] on registration or keep existing roles
  let safeRoles: TrainerRole[] = ['TRAINER'];
  if (existingTrainer) {
    safeRoles = existingTrainer.roles;
  }

  const updatedTrainer = {
    id: id || "trainer-" + Math.random().toString(36).substring(2, 9),
    name: name.trim(),
    trainerCode: trainerCode.trim(),
    team: team as "VALOR" | "MYSTIC" | "INSTINCT" | "NONE",
    level: numLevel,
    favoritePokemon: favoritePokemon ? favoritePokemon.trim() : "Pikachu",
    avatarUrl: avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    joinedAt: existingTrainer ? existingTrainer.joinedAt : new Date().toISOString(),
    roles: safeRoles,
    isBanned,
    email: cleanEmail,
    password: password
  };

  if (existingIndex !== -1) {
    db.trainers[existingIndex] = updatedTrainer;
  } else {
    db.trainers.push(updatedTrainer);
  }

  // Auto-post community system welcome if new
  if (existingIndex === -1) {
    db.chats.push({
      id: "welcome-" + Math.random().toString(36).substring(2, 9),
      channelId: "general",
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `🎉 Trainer **${updatedTrainer.name}** (LVL ${updatedTrainer.level}) joined the community! Marhaban! 🇦🇪⚔️`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json(updatedTrainer);
});

// 2. Raid Routes
app.get("/api/raids", (req, res) => {
  res.json(db.raids);
});

app.post("/api/raids", (req, res) => {
  const { bossName, tier, cp, gymName, locationDetails, startTime, endTime, photoUrl, creatorId, counters, strategy } = req.body;

  if (!bossName || !tier || !gymName || !startTime || !endTime || !creatorId) {
    return res.status(400).json({ error: "Missing required raid details" });
  }

  const creator = db.trainers.find(t => t.id === creatorId);
  if (creator && creator.isBanned) {
    return res.status(403).json({ error: "Access Denied: Your account has been suspended by an Admin." });
  }

  const isCreatorAdmin = creator && creator.roles && creator.roles.includes('ADMIN');
  const status = isCreatorAdmin ? 'APPROVED' as const : 'PENDING' as const;

  const newRaid = {
    id: "raid-" + Math.random().toString(36).substring(2, 9),
    bossName: bossName.trim(),
    tier: tier as "1-STAR" | "3-STAR" | "5-STAR" | "MEGA" | "ELITE" | "PRIMAL",
    cp: cp ? Number(cp) : undefined,
    gymName: gymName.trim(),
    locationDetails: locationDetails ? locationDetails.trim() : undefined,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    photoUrl: photoUrl || "",
    creatorId,
    counters: counters || "No specific counters logged yet. Ask AI Strategist below!",
    strategy: strategy || "Ready to organize! Join lobby and select in-person/remote.",
    rsvps: [
      { trainerId: creatorId, type: "IN_PERSON" as "IN_PERSON", joinedAt: new Date().toISOString(), slotsCount: 1 }
    ],
    createdAt: new Date().toISOString(),
    status
  };

  db.raids.push(newRaid);

  // Broadcast system notice to general chat
  const tierIcon = newRaid.tier.includes("5-STAR") ? "🌟" : newRaid.tier.includes("MEGA") ? "🌀" : "⚔️";
  if (status === 'APPROVED') {
    db.chats.push({
      id: "system-raid-" + Math.random().toString(36).substring(2, 9),
      channelId: "general",
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `${tierIcon} New ${newRaid.tier} Raid created: **${newRaid.bossName}** at **${newRaid.gymName}** by Admin ${creator ? creator.name : 'trainer'}! Ready to fight!`,
      timestamp: new Date().toISOString()
    });
  } else {
    db.chats.push({
      id: "system-raid-pending-" + Math.random().toString(36).substring(2, 9),
      channelId: "general",
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `⏳ A new ${newRaid.tier} Raid **${newRaid.bossName}** at **${newRaid.gymName}** was proposed by ${creator ? creator.name : 'a trainer'} and is awaiting Admin approval. It is currently hidden from players until approved.`,
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json(newRaid);
});

// Raid RSVP Joining
app.post("/api/raids/:id/rsvp", (req, res) => {
  const raidId = req.params.id;
  const { trainerId, type, slotsCount } = req.body;

  if (!trainerId || !type) {
    return res.status(400).json({ error: "Missing trainerId or join type (IN_PERSON/REMOTE)" });
  }

  const trainer = db.trainers.find(t => t.id === trainerId);
  if (trainer && trainer.isBanned) {
    return res.status(403).json({ error: "Access Denied: Your account has been suspended by an Admin." });
  }

  const raid = db.raids.find(r => r.id === raidId);
  if (!raid) {
    return res.status(404).json({ error: "Raid not found" });
  }

  // Remove existing RSVP from this trainer if any
  raid.rsvps = raid.rsvps.filter(r => r.trainerId !== trainerId);

  // Push new RSVP
  const rsvp = {
    trainerId,
    type: type as "IN_PERSON" | "REMOTE",
    joinedAt: new Date().toISOString(),
    slotsCount: Math.max(1, Number(slotsCount) || 1)
  };
  raid.rsvps.push(rsvp);

  // Post to raid channel
  const typeLabel = rsvp.type === "REMOTE" ? "🌐 REMOTELY" : "📍 IN-PERSON";
  const pluralSuffix = rsvp.slotsCount > 1 ? ` (bringing +${rsvp.slotsCount - 1} friend(s))` : "";
  db.chats.push({
    id: "rsvp-notif-" + Math.random().toString(36).substring(2, 9),
    channelId: `raid-${raidId}`,
    trainerId: "system",
    senderName: "System",
    senderTeam: "NONE" as const,
    content: `🙋 ${trainer ? trainer.name : "Trainer"} RSVP'd ${typeLabel}${pluralSuffix} to help!`,
    timestamp: new Date().toISOString()
  });

  res.json(raid);
});

// Raid RSVP leaving
app.delete("/api/raids/:id/rsvp", (req, res) => {
  const raidId = req.params.id;
  const { trainerId } = req.body;

  if (!trainerId) {
    return res.status(400).json({ error: "Missing trainerId" });
  }

  const raid = db.raids.find(r => r.id === raidId);
  if (!raid) {
    return res.status(404).json({ error: "Raid not found" });
  }

  const rsvpToRemove = raid.rsvps.find(r => r.trainerId === trainerId);
  raid.rsvps = raid.rsvps.filter(r => r.trainerId !== trainerId);

  if (rsvpToRemove) {
    const trainer = db.trainers.find(t => t.id === trainerId);
    db.chats.push({
      id: "rsvp-leave-" + Math.random().toString(36).substring(2, 9),
      channelId: `raid-${raidId}`,
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `❌ ${trainer ? trainer.name : "Trainer"} canceled their RSVP.`,
      timestamp: new Date().toISOString()
    });
  }

  res.json(raid);
});

// 3. Chat Routes
app.get("/api/chats/:channelId", (req, res) => {
  const channelId = req.params.channelId;
  const channelMessages = db.chats.filter(c => c.channelId === channelId);
  res.json(channelMessages);
});

app.post("/api/chats/:channelId", (req, res) => {
  const channelId = req.params.channelId;
  const { trainerId, content } = req.body;

  if (!trainerId || !content || !content.trim()) {
    return res.status(400).json({ error: "Missing trainerId or content" });
  }

  const sender = db.trainers.find(t => t.id === trainerId);
  if (sender && sender.isBanned) {
    return res.status(403).json({ error: "Access Denied: Your account has been suspended by an Admin." });
  }

  if (!sender && trainerId !== "system" && trainerId !== "ai_guide") {
    return res.status(400).json({ error: "Sender trainer profile not found" });
  }

  const newMessage = {
    id: "msg-" + Math.random().toString(36).substring(2, 9),
    channelId,
    trainerId,
    senderName: sender ? sender.name : (trainerId === "ai_guide" ? "AI Counter Strategist" : "System"),
    senderTeam: sender ? sender.team : ("NONE" as const),
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  db.chats.push(newMessage);
  res.status(201).json(newMessage);
});

// 4. Gemini AI Endpoints

// Parse Screenshot to Auto-Fill Raid Creation Form
app.post("/api/raid/parse-screenshot", async (req, res) => {
  const { base64Image } = req.body;

  if (!base64Image) {
    return res.status(400).json({ error: "No image file provided" });
  }

  // Check if AI client is setup
  if (!ai) {
    console.warn("AI Not initialized - applying standard mockup parse result.");
    return res.json({
      bossName: "Origin Forme Dialga",
      tier: "5-STAR",
      cp: 54375,
      gymName: "Waterfront Fountain",
      counters: "🪨 Lucario (Aura Sphere), Conkeldurr (Dynamic Punch), Machamp.",
      strategy: "Easy 4-man with level 40 fighting counters. Dialga uses steel and dragon moves, beware of Steel Wing!"
    });
  }

  try {
    // Extract real base64 body if it's currently a canvas / file data URL schema
    let mimeType = "image/png";
    let cleanedBase64 = base64Image;
    if (base64Image.includes(";base64,")) {
      const parts = base64Image.split(";base64,");
      const header = parts[0];
      cleanedBase64 = parts[1];
      mimeType = header.replace("data:", "");
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanedBase64
      }
    };

    const textPart = {
      text: `Analyze this mobile screenshot of a mobile gaming app "Pokémon GO" during a Raid. 
Identify the following information with high precision:
1. The Gym Name (the landmark or location of the active raid).
2. The Raid Boss Name (the name of the Pokemon appearing on the screen). If it is not a direct active raid boss but is a raid egg, declare "Raid Egg" and identify the level.
3. The Combat Power (CP) of the raid boss if clearly visible.
4. Recommend the exact official Raid Tier (e.g. 1-STAR, 3-STAR, 5-STAR, MEGA, PRIMAL, or ELITE).

Also, as a Pokémon GO battle master, recommend:
- The top 3 countering Pokemon counters (with recommended fast/charged movesets if possible).
- A safe trainer group size or tactical recommendation.

Ensure your response conforms accurately to the JSON schema specified.`
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bossName: { type: Type.STRING, description: "Name of the Raid Boss Pokémon in English (e.g. Rayquaza, Mewtwo, Groudon). Keep it precise." },
            tier: { 
              type: Type.STRING, 
              description: "Must be exactly one of: 1-STAR, 3-STAR, 5-STAR, MEGA, ELITE, or PRIMAL",
            },
            cp: { type: Type.INTEGER, description: "Raid Boss CP as a number if readable (e.g. 54148), otherwise omit" },
            gymName: { type: Type.STRING, description: "Landmark name of the Gym, or 'Local Gym' if unreadable" },
            counters: { type: Type.STRING, description: "Excellent counters list, e.g. 'Shadow Tyranitar (Bite), Hydreigon. Focus on Ice/Ghost types.'" },
            strategy: { type: Type.STRING, description: "Optimal party size (e.g. '3-5 trainers with level 35 counters' and specific fast strategy)." }
          },
          required: ["bossName", "tier", "counters", "strategy"]
        },
        systemInstruction: "You are an expert Pokemon GO analyzer assistant. Your duty is to read raid battle screenshots details and output perfectly formatted JSON matching the structural rules."
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from Gemini engine");
    }

    const parsedData = JSON.parse(resultText.trim());
    res.json(parsedData);

  } catch (error: any) {
    console.error("Gemini Parse Screenshot Error:", error);
    res.status(500).json({ 
      error: "AI failed to process image screenshot. Please check that your screenshot is clean and try again.",
      details: error.message 
    });
  }
});

// Retrieve dynamic counter strategies and counters for any Pokemon GO boss name
app.post("/api/raid/ai-advice", async (req, res) => {
  const { bossName, tier } = req.body;

  if (!bossName) {
    return res.status(400).json({ error: "Missing bossName" });
  }

  if (!ai) {
    // Standard mock fallback
    return res.json({
      advice: `🛡️ Battle tips for ${bossName}:\n- Use Pokemon that exploit its direct type weaknesses.\n- Ensure you coordinate lobby timing to fight together.\n- Bring at least 2 mega-evolved Pokemon to boost your team's DPS!`
    });
  }

  try {
    const prompt = `Provide the ultimate tactical guide against the Pokemon GO Raid Boss: "${bossName}" (Tier: ${tier || "5-STAR"}).
Include:
1. Exact Typing and Weaknesses (explaining any double weaknesses like Fire/Flying vs Rock).
2. The Top 5 Countering Pokemon in the current meta, including Shadow, Mega, and normal versions, alongside their best Movesets (Fast + Charged).
3. Recommended group size (e.g. Soloable, Duo-able, or needs 4+ trainers).
4. Weather boosts (which weather boosts the boss, and which weather boosts the counters).

Write in a highly energetic, human-like voice, formatted cleanly with emoji and Bullet points. Do not exceed 250 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are Professor Willow's battle coordinator under Pokemon GO. Give structured tactical counter guides that help raiding communities beat raids."
      }
    });

    res.json({ advice: response.text || " پروفیسر, I couldn't scan the Pokémon data right now." });
  } catch (error: any) {
    console.error("Gemini Strategy AI error:", error);
    res.status(500).json({ error: "Professor Willow's terminal failed: " + error.message });
  }
});

// --- ADMIN MODERATION ENDPOINTS ---

// Admin Approve/Reject a Raid Room
app.post("/api/admin/raids/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, adminTrainerId } = req.body;

  if (!status || !adminTrainerId) {
    return res.status(400).json({ error: "Missing required fields: status, adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can perform this action" });
  }

  const raid = db.raids.find(r => r.id === id);
  if (!raid) {
    return res.status(404).json({ error: "Raid not found" });
  }

  const oldStatus = raid.status || 'PENDING';
  raid.status = status as 'PENDING' | 'APPROVED' | 'REJECTED';

  // System general broadcast announcement on change
  if (status === 'APPROVED' && oldStatus !== 'APPROVED') {
    const tierIcon = raid.tier.includes("5-STAR") ? "🌟" : raid.tier.includes("MEGA") ? "🌀" : "⚔️";
    db.chats.push({
      id: "admin-approve-" + Math.random().toString(36).substring(2, 9),
      channelId: "general",
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `✅ Raid APPROVED & PUBLISHED by Admin ${adminUser.name}: ${tierIcon} ${raid.tier} **${raid.bossName}** at **${raid.gymName}**! Let's raid! Coordinates ready.`,
      timestamp: new Date().toISOString()
    });
  } else if (status === 'REJECTED' && oldStatus !== 'REJECTED') {
    db.chats.push({
      id: "admin-reject-" + Math.random().toString(36).substring(2, 9),
      channelId: "general",
      trainerId: "system",
      senderName: "System",
      senderTeam: "NONE" as const,
      content: `❌ Raid at **${raid.gymName}** was rejected by Admin ${adminUser.name}.`,
      timestamp: new Date().toISOString()
    });
  }

  res.json(raid);
});

// Admin Ban/Unban Trainer Profile
app.post("/api/admin/trainers/:id/ban", (req, res) => {
  const { id } = req.params;
  const { isBanned, adminTrainerId } = req.body;

  if (isBanned === undefined || !adminTrainerId) {
    return res.status(400).json({ error: "Missing required fields: isBanned, adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can perform this action" });
  }

  const trainer = db.trainers.find(t => t.id === id);
  if (!trainer) {
    return res.status(404).json({ error: "Trainer not found" });
  }

  if (trainer.id === adminTrainerId) {
    return res.status(400).json({ error: "You cannot ban your own trainer account" });
  }

  trainer.isBanned = !!isBanned;

  db.chats.push({
    id: "admin-ban-" + Math.random().toString(36).substring(2, 9),
    channelId: "general",
    trainerId: "system",
    senderName: "System",
    senderTeam: "NONE" as const,
    content: isBanned 
      ? `🚫 Trainer **${trainer.name}** was banned from the app by Admin ${adminUser.name}.`
      : `🛡️ Trainer **${trainer.name}** was unbanned by Admin ${adminUser.name}.`,
    timestamp: new Date().toISOString()
  });

  res.json(trainer);
});

// Admin Delete Trainer Profile
app.delete("/api/admin/trainers/:id", (req, res) => {
  const { id } = req.params;
  const { adminTrainerId } = req.body;

  if (!adminTrainerId) {
    return res.status(400).json({ error: "Missing required fields: adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can perform this action" });
  }

  const idx = db.trainers.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Trainer not found" });
  }

  const trainer = db.trainers[idx];
  if (trainer.id === adminTrainerId) {
    return res.status(400).json({ error: "You cannot delete your own trainer account" });
  }

  db.trainers.splice(idx, 1);

  // Clean RSVPs
  db.raids.forEach(r => {
    r.rsvps = r.rsvps.filter(rsvp => rsvp.trainerId !== id);
  });

  db.chats.push({
    id: "admin-delete-" + Math.random().toString(36).substring(2, 9),
    channelId: "general",
    trainerId: "system",
    senderName: "System",
    senderTeam: "NONE" as const,
    content: `🗑️ Trainer account **${trainer.name}** was deleted from the Pokémon GO Community Union by Admin ${adminUser.name}.`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: `Trainer successfully deleted` });
});

// Admin promote or demote user roles
app.post("/api/admin/trainers/:id/roles", (req, res) => {
  const { id } = req.params;
  const { roles, adminTrainerId } = req.body;

  if (!roles || !Array.isArray(roles) || !adminTrainerId) {
    return res.status(400).json({ error: "Missing required fields: roles list, adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can modify trainer roles." });
  }

  const trainer = db.trainers.find(t => t.id === id);
  if (!trainer) {
    return res.status(404).json({ error: "Trainer not found" });
  }

  trainer.roles = roles.filter(r => ['TRAINER', 'TRADER', 'ADMIN'].includes(r)) as TrainerRole[];
  if (!trainer.roles.includes('TRAINER')) {
    trainer.roles.unshift('TRAINER');
  }

  res.json({ success: true, trainer });
});

// System general admin passcode APIs
app.get("/api/admin/passcode", (req, res) => {
  res.json({ passcode: currentAdminPasscode });
});

app.post("/api/admin/update-passcode", (req, res) => {
  const { newPasscode, adminTrainerId } = req.body;

  if (!adminTrainerId) {
    return res.status(400).json({ error: "Missing adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can change the system passcode" });
  }

  if (!newPasscode || typeof newPasscode !== 'string' || newPasscode.trim() === '') {
    return res.status(400).json({ error: "Invalid passcode format. Please use a non-empty code." });
  }

  currentAdminPasscode = newPasscode.trim();
  res.json({ success: true, passcode: currentAdminPasscode });
});

// Admin delete any active/pending raid
app.delete("/api/admin/raids/:id", (req, res) => {
  const { id } = req.params;
  const { adminTrainerId } = req.body;

  if (!adminTrainerId) {
    return res.status(400).json({ error: "Missing adminTrainerId" });
  }

  const adminUser = db.trainers.find(t => t.id === adminTrainerId);
  if (!adminUser || !adminUser.roles.includes('ADMIN')) {
    return res.status(403).json({ error: "Access Denied: Only Admins can delete raids." });
  }

  const index = db.raids.findIndex(r => r.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Raid coordinate not found." });
  }

  const deletedRaid = db.raids[index];
  db.raids.splice(index, 1);

  db.chats.push({
    id: "admin-delete-raid-" + Math.random().toString(36).substring(2, 9),
    channelId: "general",
    trainerId: "system",
    senderName: "System",
    senderTeam: "NONE" as const,
    content: `🗑️ Raid coordinate for **${deletedRaid.bossName}** at **${deletedRaid.gymName}** was permanently removed by Admin ${adminUser.name}.`,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true, message: "Raid deleted successfully" });
});

// Private message thread getters & setters
app.get("/api/private-messages/:t1/:t2", (req, res) => {
  const { t1, t2 } = req.params;
  if (!db.privateMessages) {
    db.privateMessages = [];
  }
  const filtered = db.privateMessages.filter(
    m => (m.senderId === t1 && m.receiverId === t2) || (m.senderId === t2 && m.receiverId === t1)
  );
  res.json(filtered);
});

app.post("/api/private-messages", (req, res) => {
  const { senderId, receiverId, content } = req.body;
  if (!senderId || !receiverId || !content) {
    return res.status(400).json({ error: "Missing required fields for private message." });
  }

  const sender = db.trainers.find(t => t.id === senderId);
  if (!sender) {
    return res.status(404).json({ error: "Sender trainer not found." });
  }

  if (!db.privateMessages) {
    db.privateMessages = [];
  }

  const newMsg = {
    id: "pm-" + Math.random().toString(36).substring(2, 9),
    senderId,
    receiverId,
    senderName: sender.name,
    senderTeam: sender.team,
    content: content.trim(),
    timestamp: new Date().toISOString()
  };

  db.privateMessages.push(newMsg);
  res.status(201).json(newMsg);
});

// Catch-all for unmatched API routes to prevent falling back to HTML index.html SPA rendering
app.all("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    method: req.method,
    path: req.path
  });
});

// --- VITE DEV / PROD MIDDLEWARE INTEGRATION ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Integrate Vite as a middleware dynamically to avoid loading it in production (where it is absent)
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted in middleware mode!");
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pokemon Go Active Raid Coordinator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
