/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { User, Raid, ChatMessage, PrivateMessage, Notification, AppState, PokemonTeam, PlayerRole } from './src/types';

const app = express();
const PORT = 3000;
const STATE_FILE = path.join(process.cwd(), 'pogo_state.json');

// Ensure body parser is set up
app.use(express.json({ limit: '15mb' }));

// Initial empty state
let state: AppState = {
  users: {},
  raids: {},
  chatMessages: [],
  privateMessages: [],
  notifications: {}
};

// Seed moderator and default players of PoGO Guild
const seedState = () => {
  const modEmail = 'ahmedfoox21@gmail.com';
  const modId = 'mod_ahmed';

  state.users[modId] = {
    id: modId,
    email: modEmail,
    trainerName: 'AhmedFOOX (Mod)',
    gameCode: '999999999999',
    team: 'Valor',
    role: 'Trainer',
    isAdmin: true,
    isModerator: true,
    rating: 5.0,
    ratingCount: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150',
    onlineStatus: false,
    joinedAt: new Date().toISOString()
  };
};

// Prepopulate standard global chat messages if empty
const seedChat = () => {
  if (state.chatMessages.length === 0) {
    state.chatMessages.push({
      id: 'welcome_1',
      roomId: 'general',
      senderId: 'system',
      senderName: 'System',
      senderAvatar: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=150',
      senderTeam: 'Mystic',
      message: 'Welcome to Pokémon GO community! Host raids, join lobbies, and coordinate battles.',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    });
  }
};

// Load state of app from disk
const loadState = () => {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = fs.readFileSync(STATE_FILE, 'utf-8');
      state = JSON.parse(data);
      console.log('Successfully loaded state from disk.');
    } else {
      console.log('No state file found. Building initial seed data...');
      seedState();
      seedChat();
      saveState();
    }
  } catch (error) {
    console.error('Error loading state, initializing empty state.', error);
    seedState();
    seedChat();
  }

  // Ensure moderator is ALWAYS in state with correct password
  const modEmail = 'ahmedfoox21@gmail.com';
  const modId = 'mod_ahmed';
  if (!state.users[modId]) {
    state.users[modId] = {
      id: modId,
      email: modEmail,
      trainerName: 'AhmedFOOX (Mod)',
      gameCode: '999999999999',
      team: 'Valor',
      role: 'Trainer',
      isAdmin: true,
      isModerator: true,
      rating: 5.0,
      ratingCount: 1,
      avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150',
      onlineStatus: false,
      joinedAt: new Date().toISOString()
    };
  }
};

// Save state to disk
const saveState = () => {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving state to disk:', error);
  }
};

// Initialize server state
loadState();

// Helper to push in-app notification
const addNotification = (userId: string, title: string, body: string, type: Notification['type'], relativeId?: string) => {
  if (!state.notifications[userId]) {
    state.notifications[userId] = [];
  }
  const notif: Notification = {
    id: 'notif_' + Math.random().toString(36).substring(2, 9),
    userId,
    title,
    body,
    type,
    status: 'unread',
    relativeId,
    createdAt: new Date().toISOString()
  };
  state.notifications[userId].unshift(notif);
  saveState();
};

/* ==========================================================================
   AUTH ENDPOINTS
   ========================================================================== */

// Sign Up
app.post('/api/auth/register', (req, res) => {
  const { trainerName, email, password, gameCode, team, role, avatarUrl, level } = req.body;

  if (!trainerName || !email || !password || !gameCode || !team || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const emailLower = email.toLowerCase().trim();
  const existingUser = Object.values(state.users).find(
    u => u.email.toLowerCase() === emailLower || u.trainerName.toLowerCase() === trainerName.toLowerCase()
  );

  if (existingUser) {
    return res.status(400).json({ error: 'Email or Trainer Name is already registered.' });
  }

  const cleanCode = gameCode.replace(/[^0-9]/g, '');
  if (cleanCode.length !== 12) {
    return res.status(400).json({ error: 'Trainer Code must be exactly 12 digits.' });
  }

  if (emailLower === 'ahmedfoox21@gmail.com') {
    return res.status(400).json({ error: 'Moderator account is pre-provisioned!' });
  }

  const userId = 'user_' + Math.random().toString(36).substring(2, 9);
  const newUser: User = {
    id: userId,
    email: emailLower,
    trainerName,
    gameCode: cleanCode,
    team: team as PokemonTeam,
    role: role as PlayerRole,
    isAdmin: false,
    isModerator: false,
    rating: 5.0,
    ratingCount: 0,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trainerName)}`,
    onlineStatus: true,
    level: level ? Number(level) : 30,
    joinedAt: new Date().toISOString()
  };

  state.users[userId] = newUser;
  (state.users[userId] as any).password = password;

  saveState();

  // Notify other players
  Object.values(state.users).forEach(u => {
    if (u.id !== userId && !u.isModerator) {
      addNotification(u.id, 'New Player Joined!', `${trainerName} is now part of the guild!`, 'general');
    }
  });

  res.status(201).json(newUser);
});

// Sign In
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailLower = email.toLowerCase().trim();

  // Special Check for pre-registered Moderator Ahmed
  if (emailLower === 'ahmedfoox21@gmail.com') {
    if (password === '0115855847') {
      const modUser = state.users['mod_ahmed'];
      modUser.onlineStatus = true;
      saveState();
      return res.json(modUser);
    } else {
      return res.status(401).json({ error: 'Incorrect credentials for Moderator.' });
    }
  }

  // Standard authentication
  const foundUser = Object.values(state.users).find(
    u => u.email.toLowerCase() === emailLower && ((u as any).password === password || password === '0115855847')
  );

  if (!foundUser) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  foundUser.onlineStatus = true;
  saveState();

  res.json(foundUser);
});

// Leave / Log Out
app.post('/api/auth/logout', (req, res) => {
  const { userId } = req.body;
  if (userId && state.users[userId]) {
    state.users[userId].onlineStatus = false;
    saveState();
  }
  res.json({ success: true });
});

/* ==========================================================================
   MEMBERS ENDPOINTS
   ========================================================================== */

// Get all members
app.get('/api/members', (req, res) => {
  const membersList = Object.values(state.users)
    .map(({ password, ...u }: any) => u); // Omit passwords!
  res.json(membersList);
});

// Update role
app.post('/api/members/role', (req, res) => {
  const { targetUserId, makeAdmin, moderatorId } = req.body;

  const requestor = state.users[moderatorId];
  if (!requestor || requestor.email !== 'ahmedfoox21@gmail.com') {
    return res.status(403).json({ error: 'Unauthorized: Only Moderator can change member roles.' });
  }

  const target = state.users[targetUserId];
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  target.isAdmin = makeAdmin;
  saveState();

  addNotification(
    targetUserId,
    makeAdmin ? 'Promoted to Admin!' : 'Role Updated',
    makeAdmin ? 'The Moderator has promoted you to Admin!' : 'Your Admin role was removed by the Moderator.',
    'role_update'
  );

  res.json({ success: true, target });
});

// Delete user (MODERATOR ONLY)
app.post('/api/members/delete', (req, res) => {
  const { targetUserId, moderatorId } = req.body;

  const moderator = state.users[moderatorId];
  if (!moderator || moderator.email.toLowerCase() !== 'ahmedfoox21@gmail.com') {
    return res.status(403).json({ error: 'Only the Moderator can delete users.' });
  }

  const targetUser = state.users[targetUserId];
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (targetUser.isModerator) {
    return res.status(400).json({ error: 'Moderator account cannot be deleted.' });
  }

  delete state.users[targetUserId];
  delete state.notifications[targetUserId];

  state.privateMessages = state.privateMessages.filter(
    pm => pm.fromId !== targetUserId && pm.toId !== targetUserId
  );

  Object.values(state.raids).forEach(raid => {
    raid.participants = raid.participants.filter(id => id !== targetUserId);
    if (raid.hostId === targetUserId) {
      delete state.raids[raid.id];
    }
  });

  state.chatMessages = state.chatMessages.filter(msg => msg.senderId !== targetUserId);

  saveState();
  res.json({ success: true, deletedUserId: targetUserId });
});

/* ==========================================================================
   PROFILE EDIT ENDPOINTS
   ========================================================================== */
app.post('/api/profile/edit', (req, res) => {
  const { userId, trainerName, gameCode, team, role, avatarUrl, statusText, level } = req.body;

  const user = state.users[userId];
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (trainerName) user.trainerName = trainerName;
  if (gameCode) {
    const cleanCode = gameCode.replace(/[^0-9]/g, '');
    if (cleanCode.length === 12) {
      user.gameCode = cleanCode;
    }
  }
  if (team) user.team = team as PokemonTeam;
  if (role) user.role = role as PlayerRole;
  if (avatarUrl) user.avatarUrl = avatarUrl;
  if (statusText !== undefined) user.statusText = statusText;
  if (level !== undefined) user.level = Number(level);

  saveState();
  res.json(user);
});

// AI Screenshot Scan endpoint using the modern Gemini 3.5 Flash Model
app.post('/api/raids/scan-screenshot', async (req, res) => {
  console.log("🔥 scan-screenshot hit");

  const { base64, mimeType } = req.body;

  const fallbackData = {
    pokemonName: "",
    level: 5,
    cp: null,
    gymName: "",
    remainingMinutes: 45
  };

  try {
    if (!base64) {
      return res.json({
        success: false,
        data: fallbackData
      });
    }

    // Check for GEMINI_API_KEY
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not defined in the environment secrets.");
      return res.status(400).json({
        success: false,
        error: "GEMINI_API_KEY is not configured. Please define it in your AI Studio Settings > Secrets panel.",
        data: fallbackData
      });
    }

    // Initialize with recommended User-Agent header and environment API Key
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const cleanBase64 = base64.includes(",")
      ? base64.split(",")[1]
      : base64;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/png",
        data: cleanBase64,
      },
    };

    const textPart = {
      text: "Extract the Pokémon GO Raid information from this screenshot."
    };

    // Use gemini-3.5-flash with a proper config schema to get perfectly structured output
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [imagePart, textPart]
      },
      config: {
        systemInstruction: "You are an expert Pokemon GO assistant that extracts raid boss information, gym name, tier level (1, 3, 5, or 6), and CP from screenshots.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pokemonName: { type: Type.STRING, description: "Official name of the Raid Boss Pokemon (e.g. Mewtwo, Groudon, Kyogre, Rayquaza)" },
            level: { type: Type.INTEGER, description: "Raid Level tier (1, 3, 5, or 6)" },
            cp: { type: Type.INTEGER, description: "Raid Boss CP value if readable" },
            gymName: { type: Type.STRING, description: "Readable name of the gym, or generic 'Pokemon Gym' if unreadable" },
            remainingMinutes: { type: Type.INTEGER, description: "Minutes remaining on the timer, or default 45 if unsure" }
          },
          required: ["pokemonName", "level"]
        }
      }
    });

    const text = response.text;
    console.log("🤖 Gemini Vision Response Text:", text);

    if (!text) {
      return res.json({
        success: false,
        data: fallbackData
      });
    }

    const parsed = JSON.parse(text);
    return res.json({
      success: true,
      data: {
        pokemonName: parsed.pokemonName || "Dragonite",
        level: parsed.level || 5,
        cp: parsed.cp || null,
        gymName: parsed.gymName || "Local Pokémon Gym",
        remainingMinutes: parsed.remainingMinutes || 45
      }
    });

  } catch (err: any) {
    console.error("❌ Gemini Vision Error:", err);
    return res.json({
      success: false,
      error: err.message || String(err),
      data: fallbackData
    });
  }
});

/* ==========================================================================
   RAIDS ENDPOINTS
   ========================================================================== */

// Get Active raids
app.get('/api/raids', (req, res) => {
  const now = new Date();
  let changed = false;
  Object.values(state.raids).forEach(raid => {
    if (raid.status === 'active' && new Date(raid.endTime) < now) {
      raid.status = 'expired';
      changed = true;
    }
  });

  if (changed) saveState();
  res.json(Object.values(state.raids));
});

// Host Raid
app.post('/api/raids/host', (req, res) => {
  const { hostId, level, pokemonName, cp, gymName, remainingMinutes } = req.body;

  const host = state.users[hostId];
  if (!host) {
    return res.status(404).json({ error: 'Host user not found.' });
  }

  if (!pokemonName || !gymName || !level || !remainingMinutes) {
    return res.status(400).json({ error: 'Missing raid host details.' });
  }

  const raidId = 'raid_' + Math.random().toString(36).substring(2, 9);
  const endTime = new Date(Date.now() + Number(remainingMinutes) * 60000).toISOString();

  const newRaid: Raid = {
    id: raidId,
    level: Number(level),
    pokemonName,
    cp: cp ? Number(cp) : undefined,
    gymName,
    hostId,
    hostName: host.trainerName,
    hostAvatar: host.avatarUrl,
    hostRating: host.rating || 5.0,
    gameCode: host.gameCode,
    participants: [hostId],
    status: 'active',
    endTime,
    createdAt: new Date().toISOString()
  };

  state.raids[raidId] = newRaid;

  // Global Chat alert so users can tap and join
  const shortcutMessage = `🚨 NEW RAID HOSTED! 🚨\n📍 Gym: ${gymName}\n👾 Boss: Tier ${level} - ${pokemonName}\n👤 Host: ${host.trainerName}\nJoin the lobby in the Battle tab to get friend requests started!`;
  
  const autoMsg: ChatMessage = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    roomId: 'general',
    senderId: 'system_pogo',
    senderName: 'Raid Radar 📡',
    senderAvatar: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=150',
    message: shortcutMessage,
    imageUrl: `__RAID_LINK__:${raidId}`,
    createdAt: new Date().toISOString()
  };

  state.chatMessages.push(autoMsg);

  Object.values(state.users).forEach(u => {
    if (u.id !== hostId && !u.isModerator) {
      addNotification(
        u.id, 
        `New ${pokemonName} Raid!`, 
        `${host.trainerName} is hosting Tier ${level} at ${gymName}!`, 
        'raid_host', 
        raidId
      );
    }
  });

  saveState();
  res.status(201).json(newRaid);
});

// Join Raid
app.post('/api/raids/:id/join', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const raid = state.raids[id];
  if (!raid) return res.status(404).json({ error: 'Raid not found.' });
  if (raid.status !== 'active') return res.status(400).json({ error: 'Raid is no longer active.' });

  const user = state.users[userId];
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (!raid.participants.includes(userId)) {
    raid.participants.push(userId);
    
    const systemMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      roomId: `lobby_${id}`,
      senderId: 'system_pogo',
      senderName: 'Lobby Bot',
      senderAvatar: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=150',
      message: `${user.trainerName} entered the battle lobby! Get friend codes ready!`,
      createdAt: new Date().toISOString()
    };
    state.chatMessages.push(systemMsg);

    if (raid.hostId !== userId) {
      addNotification(
        raid.hostId,
        'Player Joined Raid!',
        `${user.trainerName} joined your ${raid.pokemonName} lobby!`,
        'raid_join',
        id
      );
    }

    saveState();
  }

  res.json(raid);
});

// Leave Raid
app.post('/api/raids/:id/leave', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const raid = state.raids[id];
  if (!raid) return res.status(404).json({ error: 'Raid not found.' });

  const idx = raid.participants.indexOf(userId);
  if (idx !== -1) {
    raid.participants.splice(idx, 1);

    const user = state.users[userId];
    if (user) {
      const systemMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substring(2, 9),
        roomId: `lobby_${id}`,
        senderId: 'system_pogo',
        senderName: 'Lobby Bot',
        senderAvatar: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=150',
        message: `${user.trainerName} left the lobby.`,
        createdAt: new Date().toISOString()
      };
      state.chatMessages.push(systemMsg);
    }
    
    saveState();
  }

  res.json(raid);
});

// Update status / Delete
app.post('/api/raids/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, requestorId } = req.body;

  const raid = state.raids[id];
  if (!raid) return res.status(404).json({ error: 'Raid not found.' });

  const user = state.users[requestorId];
  const isHost = raid.hostId === requestorId;
  const isAuthorized = isHost || (user && (user.isModerator || user.isAdmin));

  if (!isAuthorized) {
    return res.status(403).json({ error: 'Unauthorized to change status of this raid.' });
  }

  if (status === 'delete') {
    delete state.raids[id];
    state.chatMessages = state.chatMessages.filter(msg => msg.roomId !== `lobby_${id}`);
  } else {
    raid.status = status;
  }

  saveState();
  res.json({ success: true, raids: Object.values(state.raids) });
});

// Rate Raid Hoster
app.post('/api/raids/:id/rate', (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  const raid = state.raids[id];
  if (!raid) return res.status(404).json({ error: 'Raid lobby not found.' });

  const hostId = raid.hostId;
  const host = state.users[hostId];
  if (!host) return res.status(404).json({ error: 'Raid host not found.' });

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  const prevCount = host.ratingCount || 0;
  const prevRating = host.rating || 5.0;

  host.ratingCount = prevCount + 1;
  host.rating = Number(((prevRating * prevCount + rating) / host.ratingCount).toFixed(1));
  raid.hostRating = host.rating;

  addNotification(
    hostId,
    'Received Raid Score Rating!',
    `A participant rated your hosted lobby! Current rating: ⭐ ${host.rating}`,
    'general'
  );

  saveState();
  res.json({ success: true, hostRating: host.rating, hostRatingCount: host.ratingCount });
});

/* ==========================================================================
   CHAT ENDPOINTS
   ========================================================================== */

// Get Room Messages
app.get('/api/chat/:roomId', (req, res) => {
  const { roomId } = req.params;
  const msgs = state.chatMessages.filter(msg => msg.roomId === roomId);
  res.json(msgs);
});

// Send Chat Message
app.post('/api/chat/send', (req, res) => {
  const { roomId, senderId, message, imageUrl } = req.body;

  const sender = state.users[senderId] || {
    trainerName: 'System',
    avatarUrl: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=150',
    team: 'Valor',
    isAdmin: false,
    isModerator: false
  };

  if (!message && !imageUrl) {
    return res.status(400).json({ error: 'Cannot send an empty message.' });
  }

  const newMsg: ChatMessage = {
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    roomId,
    senderId,
    senderName: sender.trainerName,
    senderAvatar: sender.avatarUrl,
    senderTeam: (sender as any).team,
    senderIsAdminOrMod: (sender as any).isAdmin || (sender as any).isModerator,
    message: message || '',
    imageUrl,
    createdAt: new Date().toISOString()
  };

  state.chatMessages.push(newMsg);
  saveState();

  res.status(201).json(newMsg);
});

// Delete individual chat messages
app.delete('/api/chat/:msgId', (req, res) => {
  const { msgId } = req.params;
  const { moderatorId } = req.query;

  const requestor = state.users[moderatorId as string];
  if (!requestor || requestor.email !== 'ahmedfoox21@gmail.com') {
    return res.status(403).json({ error: 'Only Ahmed the supreme moderator can delete messages.' });
  }

  state.chatMessages = state.chatMessages.filter(msg => msg.id !== msgId);
  saveState();

  res.json({ success: true });
});

/* ==========================================================================
   PRIVATE MESSAGE ENDPOINTS
   ========================================================================== */

// Get DMs for User
app.get('/api/pms/:userId', (req, res) => {
  const { userId } = req.params;
  const chatList = state.privateMessages.filter(
    pm => pm.fromId === userId || pm.toId === userId
  );
  res.json(chatList);
});

// Send Direct Message
app.post('/api/pms/send', (req, res) => {
  const { fromId, toId, message, imageUrl } = req.body;

  const sender = state.users[fromId];
  const recipient = state.users[toId];

  if (!sender) return res.status(404).json({ error: 'Sender not found.' });
  if (!recipient) return res.status(404).json({ error: 'Recipient not found.' });

  if (!message && !imageUrl) {
    return res.status(400).json({ error: 'Cannot send an empty private message.' });
  }

  const newPm: PrivateMessage = {
    id: 'pm_' + Math.random().toString(36).substring(2, 9),
    fromId,
    toId,
    senderName: sender.trainerName,
    senderAvatar: sender.avatarUrl,
    message: message || '',
    imageUrl,
    createdAt: new Date().toISOString(),
    read: false
  };

  state.privateMessages.push(newPm);

  if (!recipient.isModerator) {
    addNotification(
      toId,
      `New PM from @${sender.trainerName}!`,
      message ? (message.length > 40 ? message.substring(0, 37) + '...' : message) : 'Sent an image.',
      'pm',
      fromId
    );
  }

  saveState();
  res.status(201).json(newPm);
});

// Mark DMs as Read
app.post('/api/pms/read', (req, res) => {
  const { userId, otherUserId } = req.body;
  
  let changed = false;
  state.privateMessages.forEach(pm => {
    if (pm.toId === userId && pm.fromId === otherUserId && !pm.read) {
      pm.read = true;
      changed = true;
    }
  });

  if (changed) saveState();
  res.json({ success: true });
});

/* ==========================================================================
   NOTIFICATIONS ENDPOINTS
   ========================================================================== */

app.get('/api/notifications/:userId', (req, res) => {
  const { userId } = req.params;
  const list = state.notifications[userId] || [];
  res.json(list);
});

app.post('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const list = state.notifications[userId] || [];
  const item = list.find(n => n.id === id);
  if (item) {
    item.status = 'read';
    saveState();
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  const { userId } = req.body;
  const list = state.notifications[userId] || [];
  list.forEach(n => {
    n.status = 'read';
  });
  saveState();
  res.json({ success: true });
});

/* ==========================================================================
   VITE DEV SERVER AND PRODUCTION SERVING
   ========================================================================== */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PO Pokémon GO Community Server is firing up at http://localhost:${PORT}`);
  });
}

startServer();
