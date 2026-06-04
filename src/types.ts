/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PokemonTeam = 'Valor' | 'Mystic' | 'Instinct';
export type PlayerRole = 'Trader' | 'Trainer';

export interface User {
  id: string;
  email: string;
  trainerName: string;
  gameCode: string; // 12-digit code
  team: PokemonTeam;
  role: PlayerRole;
  isAdmin: boolean;
  isModerator: boolean;
  rating: number; // average host score
  ratingCount: number; // number of ratings
  avatarUrl: string; // avatar link or base64
  onlineStatus: boolean;
  statusText?: string;
  level?: number;
  joinedAt: string;
}

export interface Raid {
  id: string;
  level: number; // boss tier: 1, 3, 5, 6 (Mega/Primal)
  pokemonName: string;
  cp?: number;
  gymName: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  hostRating: number;
  gameCode: string;
  participants: string[]; // list of user ids
  status: 'active' | 'completed' | 'expired';
  endTime: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

export interface ChatMessage {
  id: string;
  roomId: string; // 'general' | 'admin-trader' | 'lobby_<raid_id>'
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderTeam?: PokemonTeam;
  senderIsAdminOrMod?: boolean;
  message: string;
  imageUrl?: string;
  createdAt: string;
}

export interface PrivateMessage {
  id: string;
  fromId: string;
  toId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'pm' | 'raid_join' | 'raid_host' | 'role_update' | 'general';
  status: 'unread' | 'read';
  relativeId?: string; // raidId, pm senderId, etc.
  createdAt: string;
}

export interface AppState {
  users: Record<string, User>;
  raids: Record<string, Raid>;
  chatMessages: ChatMessage[];
  privateMessages: PrivateMessage[];
  notifications: Record<string, Notification[]>; // userId -> notifications
}
