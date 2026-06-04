/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  MapPin, 
  Clock, 
  Sword, 
  PlusCircle, 
  Copy, 
  Check, 
  CheckCircle2, 
  Trash2, 
  MessageSquare, 
  Star, 
  LogOut, 
  ShieldAlert, 
  User as UserIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { User, Raid, ChatMessage } from '../types';
import { formatTrainerCode, TEAM_DETAILS, copyToClipboard } from '../utils';

interface RaidsTabProps {
  currentUser: User;
  onViewProfileOfUser: (user: User) => void;
  onOpenDirectMessage: (user: User) => void;
}

export default function RaidsTab({ currentUser, onViewProfileOfUser, onOpenDirectMessage }: RaidsTabProps) {
  const [raids, setRaids] = useState<Raid[]>([]);
  const [activeLobbyId, setActiveLobbyId] = useState<string | null>(null);
  const [isHosting, setIsHosting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [ratingsSubmitted, setRatingsSubmitted] = useState<Record<string, boolean>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Host Form State
  const [pokemonName, setPokemonName] = useState('');
  const [level, setLevel] = useState('5');
  const [cp, setCp] = useState('');
  const [gymName, setGymName] = useState('');
  const [remainingMinutes, setRemainingMinutes] = useState('45');
  const [loadingImageScan, setLoadingImageScan] = useState(false);
  const [aiScanNotice, setAiScanNotice] = useState('');

  const handleScreenshotScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingImageScan(true);
    setAiScanNotice('');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/raids/scan-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64,
            mimeType: file.type
          })
        });

        if (res.ok) {
          const result = await res.json();
          if (result.data?.pokemonName) {
            const { pokemonName: dName, level: dLvl, cp: dCp, gymName: dGym } = result.data;
           if (dName && dName.trim() !== '') setPokemonName(dName);
if (dLvl !== null && dLvl !== undefined) setLevel(String(dLvl));
if (dCp !== null && dCp !== undefined) setCp(String(dCp));
if (dGym && dGym.trim() !== '') setGymName(dGym);
            setAiScanNotice(`AI Successfully scanned! Auto-filled: ${dName || 'Raid Boss'}`);
          } else {
            alert('AI Scan could not extract data, please fill details manually.');
          }
        } else {
          alert('Failed to connect to AI scanner. Please enter manually.');
        }
      } catch (err) {
        console.error(err);
        alert('Error scanning image.');
      } finally {
        setLoadingImageScan(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard copies
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lobby Chat state
  const [lobbyMessages, setLobbyMessages] = useState<ChatMessage[]>([]);
  const [newLobbyMsg, setNewLobbyMsg] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch raids list
  const fetchRaids = async () => {
    try {
      const res = await fetch('/api/raids');
      if (res.ok) {
        const data = await res.json();
        setRaids(data);
      }
    } catch (err) {
      console.error('Error fetching raids:', err);
    }
  };

  // Poll for raid updates and messages if in lobby
  useEffect(() => {
    fetchRaids();
    const interval = setInterval(() => {
      fetchRaids();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Poll for lobby messages if inside a lobby
  useEffect(() => {
    if (!activeLobbyId) return;

    const fetchLobbyMessages = async () => {
      try {
        const res = await fetch(`/api/chat/lobby_${activeLobbyId}`);
        if (res.ok) {
          const data = await res.json();
          setLobbyMessages(data);
        }
      } catch (err) {
        console.error('Lobby chat error:', err);
      }
    };

    fetchLobbyMessages();
    const interval = setInterval(fetchLobbyMessages, 2500);
    return () => clearInterval(interval);
  }, [activeLobbyId]);

  // Scroll to bottom on lobby message stream
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyMessages.length]);

  const handleCopyCode = async (code: string, id: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  };

  const currentRaidLobby = raids.find(r => r.id === activeLobbyId);

  // If a raid lobby is active but was deleted or completed, handles graceful redirect or score prompt
  const isHost = currentRaidLobby?.hostId === currentUser.id;

  // Form Submission
  const handleHostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pokemonName || !gymName) return;

    setLoading(true);
    try {
      const res = await fetch('/api/raids/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: currentUser.id,
          level,
          pokemonName,
          cp: cp ? Number(cp) : undefined,
          gymName,
          remainingMinutes: Number(remainingMinutes)
        })
      });

      if (res.ok) {
        const newRaid = await res.json();
        setSuccessMsg(`Success! ${pokemonName} raid is live! Link deployed to general chat.`);
        setTimeout(() => setSuccessMsg(''), 5500);
        setIsHosting(false);
        // Clear inputs
        setPokemonName('');
        setCp('');
        setGymName('');
        // Automatically enter hosted lobby
        setActiveLobbyId(newRaid.id);
        fetchRaids();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Join Action
  const handleJoinRaid = async (raidId: string) => {
    try {
      const res = await fetch(`/api/raids/${raidId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setActiveLobbyId(raidId);
        fetchRaids();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Leave Action
  const handleLeaveRaid = async (raidId: string) => {
    try {
      const res = await fetch(`/api/raids/${raidId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        setActiveLobbyId(null);
        setLobbyMessages([]);
        fetchRaids();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update status (Host or Mod)
  const handleUpdateRaidStatus = async (raidId: string, status: 'completed' | 'expired' | 'delete') => {
    try {
      const res = await fetch(`/api/raids/${raidId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, requestorId: currentUser.id })
      });
      if (res.ok) {
        if (status === 'delete') {
          setActiveLobbyId(null);
          setLobbyMessages([]);
          alert('Raid successfully deleted from server!');
        } else if (status === 'completed') {
          alert('Raid successfully marked as Completed! Users can now submit rankings.');
        } else if (status === 'expired') {
          alert('Raid marked as Expired!');
        }
        fetchRaids();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to update raid status: ${errData.error || 'Server rejected request. Make sure you are the Host or have Admin/Moderator powers.'}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error updating raid status: ${err.message || err}`);
    }
  };

  // Send Lobby Chat msg
  const handleSendLobbyMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLobbyMsg.trim() || !activeLobbyId) return;

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: `lobby_${activeLobbyId}`,
          senderId: currentUser.id,
          message: newLobbyMsg
        })
      });
      if (res.ok) {
        setNewLobbyMsg('');
        const sent = await res.json();
        setLobbyMessages(prev => [...prev, sent]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Rate Hoster rating
  const handleRateHost = async (raidId: string, rating: number) => {
    try {
      const res = await fetch(`/api/raids/${raidId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, userId: currentUser.id })
      });
      if (res.ok) {
        setRatingsSubmitted(prev => ({ ...prev, [raidId]: true }));
        fetchRaids();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTierBadge = (lvl: number) => {
    let text = `Tier ${lvl}`;
    let bg = 'bg-stone-500 text-white';
    if (lvl === 5) {
      text = '⚡ Tier 5 Legend';
      bg = 'bg-amber-500 text-stone-950 font-semibold';
    } else if (lvl === 6) {
      text = '🌌 Mega / Primal';
      bg = 'bg-fuchsia-600 text-white font-semibold';
    } else if (lvl === 3) {
      text = '⚔️ Tier 3 Elite';
      bg = 'bg-indigo-500 text-white';
    }
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono uppercase tracking-wide shadow-sm ${bg}`}>{text}</span>;
  };

  // Quick lookup user profile safely
  const handleViewParticipant = async (pId: string) => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const list: User[] = await res.ok ? await res.json() : [];
        const found = list.find((u: User) => u.id === pId);
        if (found) {
          onViewProfileOfUser(found);
        } else if (pId === currentUser.id) {
          onViewProfileOfUser(currentUser);
        } else {
          // Fallback basic view
          onViewProfileOfUser({
            id: pId,
            trainerName: 'Active Sentry',
            gameCode: '000000000000',
            team: 'Valor',
            role: 'Trainer',
            avatarUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
          } as any);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="raids-lobby-container" className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-5 p-1">
      
      {/* LEFT CONTENT: Active List or Active Lobby Panel */}
      <div id="left-raids-panel" className="flex-1 flex flex-col bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
        
        {activeLobbyId && currentRaidLobby ? (
          /* ====================================================================
             INSIDE ACTIVE LOBBY VIEW
             ==================================================================== */
          <div id="active-raid-lobby-ui" className="flex-1 flex flex-col h-full bg-stone-50 dark:bg-stone-950">
            {/* Lobby Header */}
            <div className="bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800/60 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                  <Sword className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-stone-950 dark:text-stone-50">{currentRaidLobby.pokemonName}</h2>
                    {getTierBadge(currentRaidLobby.level)}
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    <span>Gym: <strong className="text-stone-700 dark:text-stone-300">{currentRaidLobby.gymName}</strong></span>
                  </p>
                </div>
              </div>

              {/* Countdown Tracker */}
              <div className="flex items-center gap-4">
                <div className="bg-stone-100 dark:bg-stone-800/80 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2">
                  <Clock className="h-4 w-4 text-stone-500 dark:text-stone-400" />
                  <span className="text-stone-600 dark:text-stone-300">
                    Remaining: {Math.max(0, Math.ceil((new Date(currentRaidLobby.endTime).getTime() - Date.now()) / 60000))} min
                  </span>
                </div>

                <button
                  id="btn-leave-lobby"
                  onClick={() => handleLeaveRaid(currentRaidLobby.id)}
                  className="px-3.5 py-1.5 bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 border border-transparent dark:hover:bg-stone-700 rounded-lg text-stone-700 dark:text-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave Lobby
                </button>
              </div>
            </div>

            {/* Rating overlay if raid is completed */}
            {currentRaidLobby.status === 'completed' && (
              <div className="bg-amber-500/10 p-4 border-b border-amber-500/20 text-center flex flex-col items-center justify-center gap-1.5">
                <div className="flex items-center gap-1.5 justify-center text-amber-600 font-bold uppercase text-[10px] tracking-widest leading-none">
                  <Star className="h-4.5 w-4.5 text-amber-500 fill-amber-505 fill-amber-500 animate-bounce" />
                  Raid Completed successfully!
                </div>
                <h3 className="font-extrabold text-stone-900 dark:text-stone-50 text-sm">Rate Your Raid Host</h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 max-w-lg mx-auto leading-normal">
                  The host marked this lobby as complete! Tap the stars (1-5) to rank <strong>{currentRaidLobby.hostName}</strong>'s raid coordination:
                </p>
                {ratingsSubmitted[currentRaidLobby.id] ? (
                  <p className="text-xs text-green-600 dark:text-green-400 font-bold flex items-center gap-1 bg-green-500/15 p-1.5 px-3.5 rounded-xl border border-green-500/20">
                    <Check className="h-3.5 w-3.5" /> Rating submitted! Thank you and get ready for the next battle!
                  </p>
                ) : (
                  <div className="flex items-center justify-center gap-2 mt-1 bg-stone-100 dark:bg-stone-900 rounded-2xl p-2 px-4 shadow-xs border border-stone-200/50 dark:border-stone-800/40">
                    {[1, 2, 3, 4, 5].map(starValue => (
                      <button
                        key={starValue}
                        onClick={() => handleRateHost(currentRaidLobby.id, starValue)}
                        className="p-1.5 hover:scale-125 focus:scale-125 hover:text-amber-500 text-stone-300 dark:text-stone-700 transition-all cursor-pointer"
                        title={`Rate ${starValue} stars`}
                      >
                        <Star className="h-6 w-6 fill-current" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Main Inside Body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-full">
              
              {/* Left Column: Lobby Members (45% width on desktop) */}
              <div id="lobby-members-area" className="lg:col-span-6 border-r border-stone-200/60 dark:border-stone-800/60 bg-white dark:bg-stone-900 flex flex-col overflow-y-auto p-4 gap-4">
                <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800/50 pb-3">
                  <h3 className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 text-sm leading-none">
                    <Users className="h-4 w-4" />
                    Lobby Raiders ({currentRaidLobby.participants.length})
                  </h3>
                  <span className="text-stone-400 text-xs font-mono font-medium">MAX: 20</span>
                </div>

                <div className="space-y-3">
                  {/* Host User block */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl relative overflow-hidden border border-stone-200/50 dark:border-stone-800">
                    <div className="absolute right-3 top-3 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[10px] font-mono font-bold tracking-wide uppercase rounded">
                      👑 Lobby Creator / Host
                    </div>
                    
                    <div className="flex gap-3">
                      <img 
                        src={currentRaidLobby.hostAvatar} 
                        alt="host avatar" 
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 rounded-full object-cover border-2 border-stone-200 dark:border-stone-700 h-11" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 
                            onClick={() => handleViewParticipant(currentRaidLobby.hostId)}
                            className="font-bold text-stone-900 dark:text-stone-100 text-sm hover:underline cursor-pointer flex items-center gap-1 truncate"
                          >
                            {currentRaidLobby.hostName}
                            <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                          </h4>
                          <div className={`text-[10px] px-1.5 py-0.5 rounded leading-none text-white font-semibold font-mono ${TEAM_DETAILS[currentRaidLobby.gameCode === '999999999999' ? 'Valor' : 'Valor']?.bg || 'bg-red-500'}`}>
                            {currentRaidLobby.hostId === currentUser.id ? 'You' : 'Host'}
                          </div>
                        </div>

                        {/* Trainer Code Display Block - Highly readable for quick touch to copy */}
                        <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                          <button
                            id="btn-copy-host-code"
                            onClick={() => handleCopyCode(currentRaidLobby.gameCode, currentRaidLobby.hostId)}
                            className="flex items-center gap-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 px-3 py-1.5 rounded-lg text-xs font-mono text-stone-800 dark:text-stone-200 select-all cursor-pointer transition-all duration-150 active:scale-95"
                            title="Touch to Copy Trainer Code"
                          >
                            <span className="text-[10px] uppercase font-semibold text-stone-400 dark:text-stone-500">TRAINER ID:</span>
                            <span className="font-bold tracking-wider">{formatTrainerCode(currentRaidLobby.gameCode)}</span>
                            {copiedId === currentRaidLobby.hostId ? (
                              <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            )}
                          </button>
                          
                          {copiedId === currentRaidLobby.hostId && (
                            <span className="text-green-500 text-[10px] font-semibold animate-bounce shrink-0">Copied! Paste in Pokémon GO!</span>
                          )}
                        </div>

                        {/* Interactive Message option if they are not the user */}
                        {currentRaidLobby.hostId !== currentUser.id && (
                          <button
                            onClick={() => handleViewParticipant(currentRaidLobby.hostId)}
                            className="mt-2 text-xs text-blue-500 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            View Trainer Card Profile
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Joined Players list */}
                  <div className="space-y-2 mt-2">
                    <p className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest pl-1">Joined Raiders</p>
                    
                    {currentRaidLobby.participants.filter(pId => pId !== currentRaidLobby.hostId).length === 0 ? (
                      <p className="text-xs text-stone-400 italic py-3 text-center bg-stone-50/50 dark:bg-stone-950/25 rounded-md">
                        Waiting for fighters to enter. Copiable coordinates are generated automatically above!
                      </p>
                    ) : (
                      currentRaidLobby.participants
                        .filter(pId => pId !== currentRaidLobby.hostId)
                        .map(pId => {
                          // Standard joined players
                          return (
                            <div key={pId} className="p-3 bg-white dark:bg-stone-800 border-b border-stone-100 dark:border-stone-800/80 rounded-xl flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="p-1 h-3 w-3 rounded-full bg-blue-500 shrink-0" /> {/* Basic team token dot */}
                                <div className="text-sm font-semibold text-stone-800 dark:text-stone-200 truncate cursor-pointer hover:underline" onClick={() => handleViewParticipant(pId)}>
                                  Raider Trainer
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleViewParticipant(pId)}
                                className="px-2 py-1 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 rounded text-[11px] text-stone-500 dark:text-stone-300 font-medium cursor-pointer"
                              >
                                View ID / Add Friend
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Host Control panel in bottom */}
                {(isHost || currentUser.isModerator || currentUser.isAdmin) && (
                  <div className="border-t border-stone-100 dark:border-stone-800 pt-4 mt-auto space-y-2.5">
                    <p className="text-xs font-bold text-red-500/90 dark:text-red-400/80 uppercase tracking-widest pl-1">Host Controls</p>
                    <div className="grid grid-cols-2 gap-2">
                       <button
                        id="btn-complete-raid"
                        onClick={() => handleUpdateRaidStatus(currentRaidLobby.id, 'completed')}
                        className="py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete Raid!
                      </button>
                      
                      <button
                        id="btn-delete-raid"
                        onClick={() => handleUpdateRaidStatus(currentRaidLobby.id, 'delete')}
                        className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Cancel / Remove
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 italic text-center leading-normal">
                      Marking as 'Complete' enables high-contrast rating boards so raiders can rank your lobby score! Cancel wipes all chats.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Exclusive Lobby Chat (55% width on desktop) */}
              <div id="lobby-chat-area" className="lg:col-span-6 bg-stone-50 dark:bg-stone-950 flex flex-col overflow-hidden h-[400px] lg:h-full">
                <div className="px-4 py-3 bg-stone-100/70 border-b border-stone-200/50 dark:bg-stone-900/40 dark:border-stone-800/80 flex items-center gap-1.5 shrink-0">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">LOBBY CHATROOM</span>
                </div>

                {/* Local Messages stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {lobbyMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/40 dark:bg-stone-900/20 rounded-2xl m-2">
                      <MessageSquare className="h-8 w-8 text-stone-300 dark:text-stone-700 mb-2" />
                      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Raid Group Chat Active</p>
                      <p className="text-[10px] text-stone-400 mt-0.5 max-w-[200px] leading-relaxed">
                        Message here to coordinate battle startup, gym codes, or remote raid passes!
                      </p>
                    </div>
                  ) : (
                    lobbyMessages.map(msg => (
                      <div key={msg.id} className="flex gap-2.5">
                        <img 
                          src={msg.senderAvatar} 
                          alt="avatar" 
                          className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-800 shrink-0 h-8" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-stone-800 dark:text-stone-200">{msg.senderName}</span>
                            <span className="text-[9px] text-stone-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="mt-1 p-2.5 rounded-2xl rounded-tl-sm bg-white dark:bg-stone-900 text-xs shadow-[0_1px_2px_rgba(0,0,0,0.015)] border border-stone-100 dark:border-stone-800/40 text-stone-700 dark:text-stone-300 whitespace-pre-wrap break-words">
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Input block */}
                <form onSubmit={handleSendLobbyMsg} className="p-3 bg-white border-t border-stone-200/50 dark:bg-stone-900 dark:border-stone-800/80 shrink-0 flex gap-2">
                  <input
                    id="input-lobby-message"
                    type="text"
                    value={newLobbyMsg}
                    onChange={(e) => setNewLobbyMsg(e.target.value)}
                    placeholder="Type to lobby chat..."
                    className="flex-1 bg-stone-50 border border-stone-200 dark:bg-stone-950 dark:border-stone-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-400 dark:text-stone-200"
                  />
                  <button
                    id="btn-send-lobby-message"
                    type="submit"
                    className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>

            </div>
          </div>
        ) : (
          /* ====================================================================
             DEFAULT: ACTIVE RAIDS LIST VIEW
             ==================================================================== */
          <div id="raids-index" className="flex-1 flex flex-col">
            
            {/* Index Header */}
            <div className="bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800/60 p-4 md:p-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-950 dark:text-stone-50 flex items-center gap-2">
                  <Sword className="h-5 w-5 text-red-500" />
                  Active Raids
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Register, host battles, copy trainer codes and coordinate combat</p>
              </div>

              <button
                id="btn-trigger-host-modal"
                onClick={() => setIsHosting(true)}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-sm shadow-red-500/10 active:scale-95"
              >
                <PlusCircle className="h-4 w-4" />
                Host a Raid
              </button>
            </div>

            {/* Raids List layout */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              
              {/* Feedback toast */}
              {successMsg && (
                <div className="p-3 bg-green-500/15 border border-green-500/20 text-green-600 dark:text-green-400 rounded-xl text-xs font-medium animate-fadeIn">
                  {successMsg}
                </div>
              )}

              {raids.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 bg-stone-100 dark:bg-stone-800/80 rounded-full text-stone-400 dark:text-stone-600 mb-3 animate-pulse">
                    <Sword className="h-8 w-8" />
                  </div>
                  <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm">No Live Battles Host</h3>
                  <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 max-w-sm">
                    No active gym lobbies hosted right now. Click "Host a Raid" to recruit standard trainers directly!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {raids.map(raid => {
                    const isCompleted = raid.status === 'completed';
                    const isCurrentParticipant = raid.participants.includes(currentUser.id);
                    const rated = ratingsSubmitted[raid.id];

                    return (
                      <div 
                        key={raid.id} 
                        id={`raid-card-${raid.id}`}
                        className={`p-4 bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-stone-800 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:border-red-400/40 dark:hover:border-red-500/20 transition-all duration-200`}
                      >
                        {/* Core Data Block */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <span className="text-[10px] text-stone-400 font-mono font-bold uppercase tracking-wider block">BOSS SPECIMEN:</span>
                              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate mt-0.5">{raid.pokemonName}</h3>
                            </div>
                            {getTierBadge(raid.level)}
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                            <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100/50 dark:border-stone-800/40">
                              <span className="text-[9px] text-stone-400 uppercase font-bold tracking-wider block">HOSTED BY:</span>
                              <span 
                                onClick={() => handleViewParticipant(raid.hostId)}
                                className="font-semibold text-stone-700 dark:text-stone-300 mt-1 hover:underline cursor-pointer flex items-center gap-1.5"
                              >
                                {raid.hostName}
                                <span className="flex items-center text-amber-500 text-[10px] ml-1">
                                  ⭐ {raid.hostRating || 5.0}
                                </span>
                              </span>
                            </div>

                            <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-xl border border-stone-100/50 dark:border-stone-800/40">
                              <span className="text-[9px] text-stone-400 uppercase font-bold tracking-wider block">GYM LOCATION:</span>
                              <span className="font-semibold text-stone-700 dark:text-stone-300 mt-1 block truncate">
                                📍 {raid.gymName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RAID LOBBY HAS BEEN COMPLETED - RATE CARD DISPLAY */}
                        {isCompleted ? (
                          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dotted border-stone-100 dark:border-stone-800 flex flex-col gap-2 mt-2">
                            <h4 className="text-xs font-bold text-center text-stone-700 dark:text-stone-300">
                              How was this host? (Rate to rank hoster!)
                            </h4>
                            
                            {rated ? (
                              <p className="text-center text-[11px] text-green-600 dark:text-green-400 font-semibold flex items-center justify-center gap-1">
                                <Check className="h-3 w-3" />
                                Rating submitted! Thank you!
                              </p>
                            ) : (
                              <div className="flex items-center justify-center gap-2 mt-1">
                                {[1, 2, 3, 4, 5].map(starValue => (
                                  <button
                                    key={starValue}
                                    onClick={() => handleRateHost(raid.id, starValue)}
                                    className="p-1.5 hover:scale-125 focus:scale-125 hover:text-amber-500 text-stone-300 dark:text-stone-700 transition-all cursor-pointer"
                                    title={`Rate ${starValue} stars`}
                                  >
                                    <Star className="h-5 w-5 fill-current" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}

                        {/* Interactive Footer & Actions list */}
                        {!isCompleted && (
                          <div className="border-t border-stone-100 dark:border-stone-800 pt-3 flex items-center justify-between">
                            <div className="text-[10px] text-stone-400 font-mono flex items-center gap-1.5">
                              <span>Raiders: <strong className="text-stone-700 dark:text-stone-300">{raid.participants.length}</strong> joined</span>
                              {(currentUser.isModerator || currentUser.isAdmin) && (
                                deleteConfirmId === raid.id ? (
                                  <span className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/20 p-1 rounded">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateRaidStatus(raid.id, 'delete');
                                        setDeleteConfirmId(null);
                                      }}
                                      className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[8.5px] uppercase font-bold tracking-wider cursor-pointer"
                                    >
                                      Confirm Delete
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-850 text-stone-500 rounded text-[8.5px] uppercase font-bold tracking-wider cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmId(raid.id)}
                                    className="p-1 px-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-450 rounded text-[9px] uppercase font-bold tracking-wider cursor-pointer transition-colors"
                                    title="Moderator: Delete Active Raid"
                                  >
                                    Delete
                                  </button>
                                )
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {isCurrentParticipant ? (
                                <button
                                  id={`btn-open-lobby-${raid.id}`}
                                  onClick={() => setActiveLobbyId(raid.id)}
                                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors"
                                >
                                  Open Active Lobby
                                </button>
                              ) : (
                                <button
                                  id={`btn-join-lobby-${raid.id}`}
                                  onClick={() => handleJoinRaid(raid.id)}
                                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 rounded-lg text-white dark:text-stone-100 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  Join Raid Lobby
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* If completed but user is host or mod or admin, offer deletion option */}
                        {isCompleted && (currentUser.id === raid.hostId || currentUser.isModerator || currentUser.isAdmin) && (
                          <div className="flex justify-end pt-2 border-t border-stone-100 dark:border-stone-800">
                            <button
                              onClick={() => handleUpdateRaidStatus(raid.id, 'delete')}
                              className="text-xs text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove Completed Lobby
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR PANEL: HOST COMPONENT INPUT FORM MODAL */}
      <AnimatePresence>
        {isHosting && (
          <div id="host-modal-overlay" className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col shadow-xl"
            >
              <div className="p-4 border-b border-stone-200/60 dark:border-stone-800/60 flex justify-between items-center bg-stone-50 dark:bg-stone-950">
                <h3 className="font-bold text-stone-950 dark:text-stone-50 flex items-center gap-1.5 text-sm">
                  <Sword className="h-4.5 w-4.5 text-red-500" />
                  Host A New Raid Group
                </h3>
                <button 
                  onClick={() => setIsHosting(false)}
                  className="text-stone-400 hover:text-stone-500 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleHostSubmit} className="p-4 overflow-y-auto space-y-4">
                {/* AI SCREENSHOT AUTO-FILL ASSISTANT COMPONENT */}
                <div className="p-3 bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 rounded-2xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse fill-amber-500/25" />
                      AI Auto-Fill Assistant
                    </span>
                    <span className="text-[9px] text-stone-400 bg-stone-105 dark:bg-stone-850 px-2 py-0.5 rounded font-mono">gemini-3.5-flash</span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal mb-2.5">
                    Upload your Pokémon GO raid screenshot. Our Vision model automatically detects the raid boss, level, CP, and gym name!
                  </p>
                  
                  <label className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-red-200 dark:border-red-900 bg-white dark:bg-stone-900/60 rounded-xl cursor-pointer hover:bg-stone-50 dark:hover:bg-red-500/10 transition-colors">
                    {loadingImageScan ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-red-505 border-t-transparent rounded-full animate-spin text-red-500" />
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">AI scanning screenshot image...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
                        <PlusCircle className="h-4 w-4 text-red-500" />
                        <span>Upload Gym Raid Screenshot</span>
                      </div>
                    )}
                    <input
                      id="ai-raid-screenshot-picker"
                      type="file"
                      accept="image/*"
                      disabled={loadingImageScan}
                      onChange={handleScreenshotScan}
                      className="hidden"
                    />
                  </label>
                  {aiScanNotice && (
                    <p className="text-[10.5px] text-green-600 dark:text-green-400 font-semibold text-center mt-2 flex items-center justify-center gap-1 leading-normal">
                      <Check className="h-3.5 w-3.5 text-green-500" /> {aiScanNotice}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Boss Level Boss</label>
                  <select
                    id="select-raid-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="1">Tier 1 - Easy</option>
                    <option value="3">Tier 3 - Elite</option>
                    <option value="5">Tier 5 - Legendary 🔥</option>
                    <option value="6">Mega / Primal 🌌</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Pokémon Boss Name</label>
                  <input
                    id="input-pokemon-name"
                    type="text"
                    required
                    value={pokemonName}
                    onChange={(e) => setPokemonName(e.target.value)}
                    placeholder="e.g. Mewtwo, Kyogre, Rayquaza"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Combat Power (CP) <span className="text-[10px] text-stone-400 italic">(optional)</span></label>
                  <input
                    id="input-raid-cp"
                    type="number"
                    value={cp}
                    onChange={(e) => setCp(e.target.value)}
                    placeholder="e.g. 54200"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Gym Name or Location</label>
                  <input
                    id="input-gym-name"
                    type="text"
                    required
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g. Downtown Central Park Fountain"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">Despawn Time / Remaining (Minutes)</label>
                  <input
                    id="input-remaining-minutes"
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={remainingMinutes}
                    onChange={(e) => setRemainingMinutes(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-confirm-host"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-colors"
                  >
                    {loading ? 'Creating Lobby...' : 'Host Battle & Send Chat Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
