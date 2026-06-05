/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sword, 
  MessageSquare, 
  Mail, 
  Users, 
  User as UserIcon, 
  LogOut, 
  Bell, 
  ChevronRight, 
  Check, 
  Copy, 
  ShieldCheck, 
  Trophy, 
  Info,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';

import RaidsTab from './components/RaidsTab';
import ChatTab from './components/ChatTab';
import PrivateMessages from './components/PrivateMessages';
import MyProfileTab from './components/MyProfileTab';
import MembersTab from './components/MembersTab';

import { User, Notification as UserNotification, PokemonTeam, PlayerRole } from './types';
import { TEAM_DETAILS, formatTrainerCode, copyToClipboard } from './utils';

// Helper to play synthesized retro sound alerts matching native game alerts (chime)
function playRetroChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First note
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.15);

    // Second note staggered
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.25);
    }, 100);
  } catch (err) {
    console.warn('Web Audio plays halted: ', err);
  }
}

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Restore session on mount
  useEffect(() => {
    const cached = localStorage.getItem('uae_poke_user_session');
    if (cached) {
      try {
        setCurrentUser(JSON.parse(cached));
      } catch (err) {
        console.error('Error recovering cached session:', err);
      }
    }
  }, []);

  const changeCurrentUserSession = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('uae_poke_user_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('uae_poke_user_session');
    }
  };
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Register Fields
  const [regTrainerName, setRegTrainerName] = useState('');
  const [regGameCode, setRegGameCode] = useState('');
  const [regTeam, setRegTeam] = useState<PokemonTeam>('Valor');
  const [regRole, setRegRole] = useState<PlayerRole>('Trainer');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');
  const [regLevel, setRegLevel] = useState(30);

  // Active Screen states
  const [activeTab, setActiveTab] = useState<'raids' | 'chat' | 'pms' | 'members' | 'profile'>('raids');

  // Interactive profile modal overlay
  const [profileOverlayUser, setProfileOverlayUser] = useState<User | null>(null);
  const [targetUserFromOuterContext, setTargetUserFromOuterContext] = useState<User | null>(null);

  // Notifications systems
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copiedModalId, setCopiedModalId] = useState(false);

  // Memory anchor to trigger sound on newly parsed notification instances
  const prevNotificationsCountRef = useRef(0);

  // Poll notifications if signed-in
  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/${currentUser.id}`);
      if (res.ok) {
        const data: UserNotification[] = await res.json();
        setNotifications(data);

        // Calculate unread count change to ring retro bells
        const unreadCount = data.filter(n => n.status === 'unread').length;
        if (unreadCount > prevNotificationsCountRef.current) {
          if (soundEnabled) {
            playRetroChime();
          }
          // Launch standard HTML5 Background Notify if supported & permitted
          const latest = data[0];
          if (latest && Notification.permission === 'granted') {
            new window.Notification(latest.title, {
              body: latest.body,
              icon: currentUser.avatarUrl
            });
          }
        }
        prevNotificationsCountRef.current = unreadCount;
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 4000);
      return () => clearInterval(interval);
    }
  }, [currentUser, soundEnabled]);

  // Request native background notification system clearance
  useEffect(() => {
    if (currentUser && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [currentUser]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      if (res.ok) {
        const user = await res.json();
        changeCurrentUserSession(user);
        // Clear forms
        setAuthEmail('');
        setAuthPassword('');
      } else {
        const err = await res.json();
        alert(err.error || 'Invalid credentials. Attempt again.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick seed logins for easier testing!
  const handleQuickLogin = async (email: string, pass: string) => {
    setAuthEmail(email);
    setAuthPassword(pass);
    // Submit login seamlessly
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      if (res.ok) {
        const user = await res.json();
        changeCurrentUserSession(user);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        const err = await res.json();
        alert(err.error || 'Quick login error');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regTrainerName || !authEmail || !authPassword || !regGameCode) return;

    // Checks code
    const digitsOnly = regGameCode.replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 12) {
      alert('Your Pokémon GO Trainer ID code must contain exactly 12 numeric digits.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerName: regTrainerName,
          email: authEmail,
          password: authPassword,
          gameCode: digitsOnly,
          team: regTeam,
          role: regRole,
          avatarUrl: regAvatarUrl || undefined,
          level: regLevel
        })
      });

      if (res.ok) {
        const user = await res.json();
        changeCurrentUserSession(user);
        // Wipes reg state
        setRegTrainerName('');
        setRegGameCode('');
        setAuthEmail('');
        setAuthPassword('');
        setRegAvatarUrl('');
      } else {
        const err = await res.json();
        alert(err.error || 'Failure to sign up.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
    } catch (e) {
      console.error(e);
    }
    changeCurrentUserSession(null);
    setNotifications([]);
    prevNotificationsCountRef.current = 0;
  };

  // Mark single notification read
  const handleReadNotification = async (notifId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mark all read
  const handleReadAllNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Join raid lobby from chat shortcut
  const handleJoinRaidLobbyDirect = (raidId: string) => {
    setActiveTab('raids');
    // We scroll or refresh in Raids tab
  };

  // Action: Open Private message thread targeting player
  const handleOpenDirectMessage = (player: User) => {
    setProfileOverlayUser(null);
    setTargetUserFromOuterContext(player);
    setActiveTab('pms');
  };

  // Action: View user overlay profile modal
  const handleOpenProfileOverlay = (player: User) => {
    setProfileOverlayUser(player);
  };

  const handleCopyCodeId = async (code: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedModalId(true);
      setTimeout(() => setCopiedModalId(false), 2000);
    }
  };

  const unreadNotifsCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans flex flex-col justify-start">
      
      {!currentUser ? (
        /* ====================================================================
           REGISTRATION & CO-ORDINATED LOGIN FORM SCREEN
           ==================================================================== */
        <div id="auth-screen" className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-br from-red-650 via-red-600 to-stone-900">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-white/25">
            <div className="text-center mb-6">
              <div className="mx-auto w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden p-1 border border-stone-800">
                <img src="/icon.png" alt="UAE Poké-community" className="w-full h-full object-cover rounded-xl" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 mt-3.5 uppercase bg-gradient-to-r from-red-600 to-stone-950 bg-clip-text text-transparent">UAE Poké-community</h1>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mt-0.5">The Ultimate UAE Trainer Hub</p>
            </div>

            {/* Switch Mode Tab buttons */}
            <div className="flex bg-stone-100 p-1 rounded-2xl mb-5">
              <button 
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer ${authMode === 'login' ? 'bg-white shadow-xs text-stone-950 animate-fadeIn' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => setAuthMode('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl cursor-pointer ${authMode === 'register' ? 'bg-white shadow-xs text-stone-950 animate-fadeIn' : 'text-stone-500 hover:text-stone-700'}`}
              >
                Sign Up
              </button>
            </div>

            {authMode === 'login' ? (
              /* SIGN IN FORM LAYOUT */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Trainer Email</label>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="trainer@mail.com"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Password</label>
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                  />
                </div>

                <button
                  id="btn-login"
                  type="submit"
                  className="w-full py-2.5 bg-red-500 hover:bg-red-650 text-white font-black rounded-xl text-xs uppercase cursor-pointer transition-colors shadow-sm"
                >
                  Enter Guild Lobby
                </button>
              </form>
            ) : (
              /* SIGN UP FORM LAYOUT */
              <form onSubmit={handleRegister} className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Trainer Nickname</label>
                  <input
                    id="register-name-input"
                    type="text"
                    required
                    value={regTrainerName}
                    onChange={(e) => setRegTrainerName(e.target.value)}
                    placeholder="AshKetchum"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Email Address</label>
                  <input
                    id="register-email-input"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="email@pogo.com"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Trainer ID Friend Code (12 DIGITS)</label>
                  <input
                    id="register-code-input"
                    type="text"
                    required
                    maxLength={14}
                    value={regGameCode}
                    onChange={(e) => setRegGameCode(e.target.value)}
                    placeholder="0000 0000 0000"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Password</label>
                  <input
                    id="register-pass-input"
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Membership Team</label>
                    <select
                      id="register-team-select"
                      value={regTeam}
                      onChange={(e) => setRegTeam(e.target.value as PokemonTeam)}
                      className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none"
                    >
                      <option value="Valor">🔥 Valor (Red)</option>
                      <option value="Mystic">❄️ Mystic (Blue)</option>
                      <option value="Instinct">⚡ Instinct (Yellow)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Guild Role</label>
                    <select
                      id="register-role-select"
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as PlayerRole)}
                      className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none"
                    >
                      <option value="Trainer">⚔️ Trainer / Fighter</option>
                      <option value="Trader">🤝 Active Specimen Trader</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Game Level (1-80)</label>
                    <select
                      id="register-level-select"
                      value={regLevel}
                      onChange={(e) => setRegLevel(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                    >
                      {Array.from({ length: 80 }, (_, i) => i + 1).map(lvl => (
                        <option key={lvl} value={lvl}>Level {lvl}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Profile Photo</label>
                    <div className="mt-1 flex items-center gap-2">
                      {regAvatarUrl ? (
                        <img src={regAvatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-stone-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] text-stone-400 font-bold">PGO</div>
                      )}
                      <label className="flex-1 px-2 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg text-[10px] text-center font-bold text-stone-700 cursor-pointer transition-colors">
                        Choose File
                        <input
                          id="register-avatar-file"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setRegAvatarUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <button
                  id="btn-register"
                  type="submit"
                  className="w-full py-2.5 bg-red-500 hover:bg-red-605 text-white font-black rounded-xl text-xs uppercase cursor-pointer shadow-sm mt-2 block"
                >
                  Verify Nickname & Join Guild
                </button>
              </form>
            )}

          </div>
        </div>
      ) : (
        /* ====================================================================
           ACTIVE SIGNED-IN APP DASHBOARD PANEL
           ==================================================================== */
        <div id="app-dashboard" className="flex-1 flex flex-col justify-start">
          
          {/* Header Bar */}
          <header className="bg-stone-900 border-b border-stone-800 text-white px-4 py-3 shrink-0 flex items-center justify-between z-20 shadow-md">
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-stone-700">
                <img src="/icon.png" alt="UAE Poké-community" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-sm font-black tracking-wider uppercase bg-gradient-to-r from-red-500 to-stone-100 bg-clip-text text-transparent block">UAE Poké-community</span>
                {currentUser.isModerator && (
                  <span className="text-[9px] text-rose-400 font-bold block -mt-1 uppercase tracking-wide">UAE Pokémon GO Community</span>
                )}
              </div>
            </div>

            {/* Right Header Navigation Items (sound, notify bell, headshot profile details, logout) */}
            <div className="flex items-center gap-3">
              
              {/* Audio synthesized toggling bell */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border border-stone-800 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer`}
                title={soundEnabled ? 'Synthesizer Beeps Enabled' : 'Synthesizer Beeps Muted'}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4 text-green-500" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {/* In-App Notifications Alert Button */}
              <div className="relative">
                <button
                  id="header-notification-bell"
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className={`p-1.5 rounded-lg border border-stone-800 hover:bg-stone-800 hover:text-white transition-colors cursor-pointer relative ${unreadNotifsCount > 0 ? 'text-red-500 animate-pulse' : 'text-stone-400'}`}
                >
                  <Bell className="h-4.5 w-4.5" />
                  {unreadNotifsCount > 0 && (
                    <span id="badge-unread-notifications-count" className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black tracking-tighter leading-none px-1 py-0.5 rounded-full">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                {/* Dropdown list */}
                <AnimatePresence>
                  {showNotificationsDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 text-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl py-2 z-50 text-xs overflow-hidden"
                    >
                      <div className="px-3.5 py-2 hover:bg-stone-50/10 border-b border-stone-100 dark:border-stone-800 flex justify-between items-center bg-stone-50 dark:bg-stone-950 shrink-0">
                        <span className="font-bold text-stone-800 dark:text-stone-200">Alert Feed</span>
                        {unreadNotifsCount > 0 && (
                          <button
                            onClick={handleReadAllNotifications}
                            className="text-[10px] text-blue-500 hover:underline cursor-pointer font-bold"
                          >
                            Read All
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800/60 p-1">
                        {notifications.length === 0 ? (
                          <p className="text-center py-6 text-stone-400 italic text-[11px]">No alerts triggered yet.</p>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                handleReadNotification(notif.id);
                                // Redirect tab if needed
                                if (notif.type === 'pm' && notif.relativeId) {
                                  // Fetch recipient info from members to trigger outer thread load
                                  fetch(`/api/members`).then(res => res.json()).then(list => {
                                    const other = list.find((u: User) => u.id === notif.relativeId);
                                    if (other) {
                                      handleOpenDirectMessage(other);
                                    }
                                  });
                                } else if (notif.type === 'raid_host' || notif.type === 'raid_join') {
                                  setActiveTab('raids');
                                }
                                setShowNotificationsDropdown(false);
                              }}
                              className={`p-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer rounded-xl transition-all ${notif.status === 'unread' ? 'bg-red-50/40 dark:bg-red-950/20' : ''}`}
                            >
                              <div className="flex gap-2">
                                <div className="p-1.5 h-6 w-6 rounded-lg bg-red-100 dark:bg-red-950 text-red-500 shrink-0 flex items-center justify-center font-bold">🎯</div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-stone-900 dark:text-stone-150 leading-tight">
                                    {notif.title}
                                  </h4>
                                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-normal">
                                    {notif.body}
                                  </p>
                                  <span className="text-[8px] text-stone-400 mt-1 block">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Headshot name displays */}
              <div 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 border bg-stone-800 border-stone-700 rounded-xl px-2.5 py-1 select-none hover:bg-stone-750 transition-colors cursor-pointer"
              >
                <img 
                  src={currentUser.avatarUrl} 
                  alt="avatar" 
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full object-cover border border-stone-600 shrink-0 h-6" 
                />
                <span className="text-xs font-bold leading-none hidden sm:inline max-w-[100px] truncate">{currentUser.trainerName}</span>
              </div>

              {/* Log Out */}
              <button
                id="header-btn-logout"
                onClick={handleLogout}
                className="p-1.5 hover:bg-stone-800 border border-stone-800 dark:border-stone-800 rounded-lg text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Disconnect from guild lobbies"
              >
                <LogOut className="h-4 w-4" />
              </button>

            </div>
          </header>

          {/* Navigation Tab Menu Sidebar Wrapper */}
          <div className="flex-1 w-full flex flex-row overflow-hidden">
            
            {/* Left Stacked Side Bar Navigation */}
            <aside className="w-16 md:w-64 bg-white/45 dark:bg-stone-900/45 p-2 md:p-3 border-r border-stone-200 dark:border-stone-800 flex flex-col gap-2 shrink-0">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-3 hidden md:block mt-2 mb-1">Guild Navigation</span>
              
              <button
                id="widget-btn-raids"
                onClick={() => setActiveTab('raids')}
                className={`w-full px-4 py-3 font-semibold uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'raids' ? 'bg-stone-950 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 hover:text-stone-950 dark:hover:bg-stone-800'}`}
              >
                <Sword className="h-4 w-4 shrink-0 text-red-500" />
                <span className="hidden md:inline">Battles & Raids</span>
              </button>

              <button
                id="widget-btn-chat"
                onClick={() => setActiveTab('chat')}
                className={`w-full px-4 py-3 font-semibold uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'chat' ? 'bg-stone-955 bg-stone-950 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 hover:text-stone-955 dark:hover:bg-stone-800'}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-blue-500" />
                <span className="hidden md:inline">Channels Chat</span>
              </button>

              <button
                id="widget-btn-pms"
                onClick={() => setActiveTab('pms')}
                className={`w-full px-4 py-3 font-semibold uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'pms' ? 'bg-stone-955 bg-stone-950 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 hover:text-stone-955 dark:hover:bg-stone-800'}`}
              >
                <Mail className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="hidden md:inline">Direct Mail</span>
              </button>

              <button
                id="widget-btn-members"
                onClick={() => setActiveTab('members')}
                className={`w-full px-4 py-3 font-semibold uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'members' ? 'bg-stone-955 bg-stone-950 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 hover:text-stone-955 dark:hover:bg-stone-800'}`}
              >
                <Users className="h-4 w-4 shrink-0 text-emerald-500" />
                
				<span className="hidden md:inline">Roster Members</span>
              </button>

              <button
                id="widget-btn-profile"
                onClick={() => setActiveTab('profile')}
                className={`w-full px-4 py-3 font-semibold uppercase text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-colors ${activeTab === 'profile' ? 'bg-stone-903 bg-stone-900 text-white shadow-md' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 hover:text-stone-900 dark:hover:bg-stone-800'}`}
              >
                <UserIcon className="h-4 w-4 shrink-0 text-purple-500" />
                
				<span className="hidden md:inline">Trainer Card</span>
              </button>
            </aside>

            {/* MAIN CONTAINER FOR WIDGETS DISPLAY PANEL */}
            <main className="flex-1 p-2 md:p-4 overflow-hidden min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  {activeTab === 'raids' && (
                    <RaidsTab
                      currentUser={currentUser}
                      onViewProfileOfUser={handleOpenProfileOverlay}
                      onOpenDirectMessage={handleOpenDirectMessage}
                    />
                  )}

                  {activeTab === 'chat' && (
                    <ChatTab
                      currentUser={currentUser}
                      onViewProfileOfUser={handleOpenProfileOverlay}
                      onJoinRaidLobbyDirect={handleJoinRaidLobbyDirect}
                      onOpenDirectMessage={handleOpenDirectMessage}
                    />
                  )}

                  {activeTab === 'pms' && (
                    <PrivateMessages
                      currentUser={currentUser}
                      targetUserFromOuterContext={targetUserFromOuterContext}
                      onClearTargetOuterContext={() => setTargetUserFromOuterContext(null)}
                    />
                  )}

                  {activeTab === 'members' && (
                    <MembersTab
                      currentUser={currentUser}
                      onOpenDirectMessage={handleOpenDirectMessage}
                      onOpenProfileOverlay={handleOpenProfileOverlay}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <MyProfileTab
                      currentUser={currentUser}
                      onUpdateCurrentUser={(updated) => changeCurrentUserSession(updated)}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* ====================================================================
             MEMBER PROFILE INTERACTIVE MODAL OVERLAY (View overlay when triggered)
             ==================================================================== */}
          <AnimatePresence>
            {profileOverlayUser && (
              <div id="profile-modal-overlay" className="fixed inset-0 z-50 bg-stone-950/60 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
                >
                  <div className={`h-24 bg-gradient-to-r ${TEAM_DETAILS[profileOverlayUser.team]?.accent || 'from-stone-700 to-stone-900'} flex items-end px-5 pb-3 justify-end`}>
                    <button 
                      onClick={() => setProfileOverlayUser(null)}
                      className="text-stone-400 bg-white/20 hover:bg-white/35 backdrop-blur-xs p-1 px-2.5 rounded text-xs text-white leading-none cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="p-5 pt-0 relative">
                    <img
                      src={profileOverlayUser.avatarUrl}
                      alt="headshot"
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-2xl object-cover bg-white dark:bg-stone-800 border p-1 shadow-md -translate-y-10 mb-[-30px] h-20"
                    />

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-lg font-black text-stone-900 dark:text-stone-105">
                            {profileOverlayUser.trainerName}
                          </h4>
                          {profileOverlayUser.isAdmin && (
                            <span className="bg-amber-500/10 text-amber-500 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wide uppercase">
                              ADMIN
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-mono leading-none font-bold block mt-1 ${TEAM_DETAILS[profileOverlayUser.team]?.text || 'text-stone-500'}`}>
                          {profileOverlayUser.team} Team — {profileOverlayUser.role}
                        </span>

                        {profileOverlayUser.statusText && (
                          <p className="mt-3 p-3 bg-stone-50 dark:bg-stone-950 text-stone-500 dark:text-stone-400 rounded-xl text-xs italic leading-normal border border-stone-100 dark:border-stone-800/40">
                            " {profileOverlayUser.statusText} "
                          </p>
                        )}
                      </div>

                      {/* Display gameCode details */}
                      <div className="p-3 bg-stone-50 dark:bg-stone-950 rounded-xl border border-stone-200/50 dark:border-stone-800/80 flex flex-col gap-2">
                        <span className="text-[9px] text-stone-400 font-bold block uppercase tracking-wide">FRIEND CODE ID:</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold font-mono tracking-widest text-stone-800 dark:text-stone-250 select-all">
                            {formatTrainerCode(profileOverlayUser.gameCode)}
                          </span>
                          
                          <button
                            onClick={() => handleCopyCodeId(profileOverlayUser.gameCode)}
                            className="p-1 px-2.5 bg-white border border-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:border-stone-805 rounded text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                          >
                            {copiedModalId ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                            {copiedModalId ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* Score metrics */}
                      <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs">
                        <span className="text-stone-400 font-bold shrink-0">Hoster Rating:</span>
                        <span className="font-bold text-amber-500 flex items-center gap-0.5">
                          ⭐ {profileOverlayUser.rating ? profileOverlayUser.rating.toFixed(1) : '5.0'} 
                          <span className="text-stone-400 text-[10px] font-normal font-mono ml-1">
                            ({profileOverlayUser.ratingCount || 0} reviews)
                          </span>
                        </span>
                      </div>

                      {profileOverlayUser.id !== currentUser.id && (
                        <button
                          id="btn-modal-pm"
                          onClick={() => handleOpenDirectMessage(profileOverlayUser)}
                          className="w-full py-2 bg-stone-900 border border-transparent hover:bg-stone-950 dark:bg-stone-800 dark:hover:bg-stone-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Send Private Message
                        </button>
                      )}

                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        </div>
      )}

    </div>
  );
}
