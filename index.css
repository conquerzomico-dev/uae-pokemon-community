/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send,  
  Image as ImageIcon, 
  Trash2, 
  Lock, 
  Users, 
  MessageCircle, 
  Sparkles,
  Sword,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { User, ChatMessage, Raid } from '../types';
import { TEAM_DETAILS } from '../utils';

interface ChatTabProps {
  currentUser: User;
  onViewProfileOfUser: (user: User) => void;
  onJoinRaidLobbyDirect: (raidId: string) => void;
  onOpenDirectMessage: (user: User) => void;
}

// Quick funny Sticker triggers
const STICKERS = [
  { text: '🎯 Nice Shot!', code: 'sticker_nice' },
  { text: '🌟 Great Throw!', code: 'sticker_great' },
  { text: '✨ Excellent!', code: 'sticker_excellent' },
  { text: '🔥 raid on!', code: 'sticker_raid' },
  { text: '🤝 Lucky trade?', code: 'sticker_lucky' },
  { text: '⚡ Gotcha!', code: 'sticker_gotcha' }
];

export default function ChatTab({ currentUser, onViewProfileOfUser, onJoinRaidLobbyDirect, onOpenDirectMessage }: ChatTabProps) {
  const [activeRoom, setActiveRoom] = useState<'general' | 'admin-trader'>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [raidsList, setRaidsList] = useState<Raid[]>([]);
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${activeRoom}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load active members (filtered, keeping Ahmed secret)
  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch raids to bind shortcuts
  const fetchRaids = async () => {
    try {
      const res = await fetch('/api/raids');
      if (res.ok) {
        const data = await res.json();
        setRaidsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchMembers();
    fetchRaids();

    const interval = setInterval(() => {
      fetchMessages();
      fetchMembers();
      fetchRaids();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeRoom]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() && !imageUrl) return;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoom,
          senderId: currentUser.id,
          message: newMsg,
          imageUrl: imageUrl || undefined
        })
      });

      if (res.ok) {
        setNewMsg('');
        setImageUrl('');
        setShowStickers(false);
        fetchMessages();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to send message.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Use Quick sticker
  const handleUseSticker = async (stickerText: string) => {
    try {
      await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: activeRoom,
          senderId: currentUser.id,
          message: `${stickerText}`
        })
      });
      setShowStickers(false);
      fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete message (Moderator Ahmed ONLY!)
  const handleDeleteMessage = async (msgId: string) => {
    try {
      const res = await fetch(`/api/chat/${msgId}?moderatorId=${currentUser.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDeletingMsgId(null);
        fetchMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle click on User Card to view profiles or PM
  const handleSelectUser = (pUser: User) => {
    onViewProfileOfUser(pUser);
  };

  // Check role eligibility for Admin/Trader chatroom
  const isTrader = currentUser.role === 'Trader';
  const hasAccessToAdminTrader = isTrader || currentUser.isAdmin || currentUser.isModerator;

  return (
    <div id="chat-tab-container" className="h-[calc(100vh-140px)] flex bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
      
      {/* 1. MAIN CHAT PORTION (left side, 75% width on desktop) */}
      <div id="chat-main" className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Chat Widget Room Tabs */}
        <div className="bg-stone-50 border-b border-stone-200/60 dark:bg-stone-950 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2 bg-stone-200/60 dark:bg-stone-800 p-1 rounded-xl">
            <button
              id="tab-btn-general"
              onClick={() => setActiveRoom('general')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer transition-colors ${activeRoom === 'general' ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400'}`}
            >
              💬 General Chat
            </button>
            <button
              id="tab-btn-admin-trader"
              onClick={() => setActiveRoom('admin-trader')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold leading-none cursor-pointer transition-colors ${activeRoom === 'admin-trader' ? 'bg-white dark:bg-stone-900 shadow-sm text-stone-900 dark:text-white' : 'text-stone-500 dark:text-stone-400'}`}
            >
              🔒 Admins & Traders Chat
            </button>
          </div>

          <span className="text-stone-400 text-[10px] font-mono leading-none tracking-widest hidden sm:inline uppercase">
             Room ID: {activeRoom}
          </span>
        </div>

        {/* Access Restriction Check */}
        {activeRoom === 'admin-trader' && !hasAccessToAdminTrader ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-stone-100/50 dark:bg-stone-950/25">
            <div className="p-4 bg-red-100/10 text-red-500 rounded-full mb-3">
              <Lock className="h-8 w-8" />
            </div>
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">Access Denied</h3>
            <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4 leading-relaxed">
              This special coordinate is locked for non-members of the trade-guild. To access this chat, select role as <strong>"Trader"</strong> in your profile, or receive Admin clearance from the Moderator!
            </p>
          </div>
        ) : (
          /* Messasges List viewport */
          <div className="flex-1 flex flex-col overflow-hidden justify-between h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-stone-50/10">
                  <MessageCircle className="h-8 w-8 text-stone-300 dark:text-stone-700 mb-2 animate-bounce" />
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Welcome to #{activeRoom}!</p>
                  <p className="text-[10px] text-stone-400 dark:text-stone-500 max-w-xs mt-0.5 leading-relaxed">
                    Be the first to share an item of trainer news or coordinate remote battle teams with the community.
                  </p>
                </div>
              ) : (
                messages.map(msg => {
                  // Bind special template layout for hosted raids shortcuts!
                  const isRaidShortcut = msg.imageUrl?.startsWith('__RAID_LINK__:');
                  
                  if (isRaidShortcut) {
                    const raidId = msg.imageUrl?.split(':')[1];
                    const targetRaid = raidsList.find(r => r.id === raidId);

                    return (
                      <div key={msg.id} className="p-4 bg-gradient-to-r from-red-50/40 via-white to-red-50/30 dark:from-stone-900/40 dark:to-stone-900/20 border border-red-500/20 dark:border-red-500/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                            <Sword className="h-6 w-6 animate-pulse" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-500">Live Battle Recruitment!</span>
                            </div>
                            
                            {targetRaid ? (
                              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-1">
                                {targetRaid.pokemonName} Raid at 📍 {targetRaid.gymName}
                              </h4>
                            ) : (
                              <h4 className="text-sm font-medium text-stone-500 mt-1 italic">
                                This Battle has ended or expired.
                              </h4>
                            )}
                            
                            <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5 whitespace-pre-line leading-normal">
                              {msg.message}
                            </p>
                          </div>
                        </div>

                        {/* Inline Join action if raid still live */}
                        {targetRaid && targetRaid.status === 'active' && (
                          <button
                            id={`btn-join-shortcut-${targetRaid.id}`}
                            onClick={() => onJoinRaidLobbyDirect(targetRaid.id)}
                            className="w-full md:w-auto px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer shrink-0 transition-transform active:scale-95 text-center block"
                          >
                            Join Raid Lobby! 🔥
                          </button>
                        )}
                      </div>
                    );
                  }

                  // Render standard Chat Message container
                  const teamDetails = msg.senderTeam ? TEAM_DETAILS[msg.senderTeam] : null;

                  return (
                    <div key={msg.id} className="flex gap-3 group">
                      <img 
                        src={msg.senderAvatar} 
                        alt="avatar" 
                        className="w-9 h-9 rounded-full object-cover border border-stone-200 dark:border-stone-800 shrink-0 h-9" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{msg.senderName}</span>
                          
                          {/* Emblems representing guild ranks */}
                          {msg.senderIsAdminOrMod && (
                            <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 font-bold rounded text-[9px] flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" /> MOD / ADMIN
                            </span>
                          )}

                          {teamDetails && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${teamDetails.color}`}>
                              {msg.senderTeam}
                            </span>
                          )}

                          <span className="text-[9px] text-stone-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Standard Message Content Card */}
                        <div className="mt-1 bg-stone-50/50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800/40 p-2.5 rounded-2xl rounded-tl-sm text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words inline-block max-w-[90%] font-sans leading-relaxed">
                          {msg.message}

                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="attached card upload preview"
                              referrerPolicy="no-referrer"
                              className="mt-2 rounded-xl border border-stone-100 dark:border-stone-800 max-h-[180px] object-cover block w-full"
                            />
                          )}
                        </div>

                        {/* Delete capability visible to Ahmed the Moderator */}
                        {currentUser.isModerator && (
                          deletingMsgId === msg.id ? (
                            <div className="inline-flex items-center gap-1 ml-2.5 opacity-100 self-center">
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="text-[10px] bg-rose-650 bg-rose-600 text-white font-bold p-1 px-1.5 rounded-lg cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingMsgId(null)}
                                className="text-[10px] bg-stone-105 dark:bg-stone-800 text-stone-500 font-bold p-1 px-1.5 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingMsgId(msg.id)}
                              className="opacity-0 group-hover:opacity-100 ml-2.5 text-rose-500 hover:text-rose-600 transition-opacity cursor-pointer inline-flex items-center self-center"
                              title="Moderator: Delete Message"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Interface Area */}
            <div className="p-3 border-t border-stone-200/60 dark:bg-stone-900 dark:border-stone-800 flex flex-col gap-2 shrink-0">
              
              {/* Sticker Quick Triggers toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  <button
                    onClick={() => setShowStickers(!showStickers)}
                    className="p-1 px-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg text-stone-600 dark:text-stone-300 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Stickers
                  </button>

                  <AnimatePresence>
                    {showStickers && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-1 shrink-0"
                      >
                        {STICKERS.map(stick => (
                          <button
                            key={stick.code}
                            type="button"
                            onClick={() => handleUseSticker(stick.text)}
                            className="px-2 py-0.5 bg-red-50 dark:bg-stone-800 text-red-600 dark:text-stone-200 hover:bg-red-100/80 rounded font-bold text-[10px] shrink-0 cursor-pointer"
                          >
                            {stick.text}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  id="chat-input-message"
                  type="text"
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder={`Write message to ${activeRoom} channel...`}
                  className="flex-1 px-3 py-2 border border-stone-200 bg-stone-50 dark:bg-stone-950 dark:border-stone-800 rounded-xl text-xs focus:outline-none focus:border-red-400 dark:text-stone-200"
                />

                {/* Optional Image URL paste */}
                <div className="relative flex items-center">
                  <input
                    id="chat-input-image-url"
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Photo URL link (Optional)"
                    className="w-24 sm:w-36 px-2 py-2 border border-stone-200 bg-stone-50 dark:bg-stone-950 dark:border-stone-800 rounded-xl text-[10px] focus:outline-none"
                    title="Paste a custom image link here"
                  />
                  <ImageIcon className="absolute right-2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                </div>

                <button
                  id="chat-btn-submit"
                  type="submit"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* 2. CHAT ACTIVE MEMBERS SIDEBAR (Right side, 25% width on desktop) */}
      <div id="chat-members-sidebar" className="w-[180px] sm:w-[240px] border-l border-stone-200/60 dark:border-stone-800/60 bg-stone-50/50 dark:bg-stone-950/40 flex flex-col h-full overflow-hidden hidden md:flex shrink-0">
        <div className="px-3.5 py-4 bg-stone-50 dark:bg-stone-950 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-stone-500" />
          <span className="text-xs font-bold text-stone-800 dark:text-stone-200 leading-none">ACTIVE MEMBERS ({members.filter(m => m.onlineStatus).length})</span>
        </div>

        {/* Members Status List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {members.map(member => {
            const teamInfo = TEAM_DETAILS[member.team];
            return (
              <div
                key={member.id}
                onClick={() => handleSelectUser(member)}
                className="p-2 hover:bg-white dark:hover:bg-stone-900 border border-transparent hover:border-stone-200/50 dark:hover:border-stone-800/80 rounded-xl flex items-center justify-between gap-1.5 cursor-pointer transition-all duration-150 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative">
                    <img
                      src={member.avatarUrl}
                      alt="member headshot"
                      referrerPolicy="no-referrer"
                      className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-700 h-7"
                    />
                    {member.onlineStatus ? (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 border border-white rounded-full" />
                    ) : (
                      <span className="absolute bottom-0 right-0 w-2 h-2 bg-stone-400 border border-white rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate group-hover:underline">
                      {member.trainerName}
                    </h4>
                    <p className={`text-[9px] font-mono leading-none mt-0.5 ${teamInfo?.text || 'text-stone-500'}`}>
                      {member.team}
                    </p>
                  </div>
                </div>

                <span className="text-[9px] px-1 bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded group-hover:block hidden shrink-0 font-medium">
                  ID Profile
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
