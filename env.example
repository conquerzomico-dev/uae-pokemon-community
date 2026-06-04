/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User as UserIcon, 
  Settings, 
  MapPin, 
  Star, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sword, 
  Sparkles,
  RefreshCw,
  Trophy
} from 'lucide-react';
import { User, PokemonTeam, PlayerRole } from '../types';
import { TEAM_DETAILS, AVATAR_PRESETS, formatTrainerCode, copyToClipboard } from '../utils';

interface MyProfileTabProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
}

export default function MyProfileTab({ currentUser, onUpdateCurrentUser }: MyProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Form Fields
  const [trainerName, setTrainerName] = useState(currentUser.trainerName);
  const [gameCode, setGameCode] = useState(currentUser.gameCode);
  const [team, setTeam] = useState<PokemonTeam>(currentUser.team);
  const [role, setRole] = useState<PlayerRole>(currentUser.role);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [level, setLevel] = useState(currentUser.level || 30);

  const handleCopyCode = async () => {
    const ok = await copyToClipboard(currentUser.gameCode);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');

    // Format code
    const digitsOnly = gameCode.replace(/[^0-9]/g, '');
    if (digitsOnly.length !== 12) {
      alert('Your Trainer Code register must be exactly 12 digits long!');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/profile/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          trainerName,
          gameCode: digitsOnly,
          team,
          role,
          avatarUrl,
          statusText,
          level
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdateCurrentUser(updated);
        setSuccess('Profile updated successfully! ⭐️');
        setIsEditing(false);
        setTimeout(() => setSuccess(''), 4500);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save changes.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const teamData = TEAM_DETAILS[currentUser.team];

  // Map average rating stars to cute descriptions
  const getRankName = (avgRating: number, count: number) => {
    if (count === 0) return 'Beginner Recruiter 🏟️';
    if (avgRating >= 4.7) return 'Master Raid Captain 🌟';
    if (avgRating >= 4.0) return 'Elite Battle Coordinator ⚔️';
    return 'Regular Gym Host 🛡️';
  };

  return (
    <div id="my-profile-tab" className="max-w-2xl mx-auto p-1 py-4 space-y-6">
      
      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/15 text-green-600 dark:text-green-400 font-medium rounded-2xl text-xs text-center animate-fadeIn">
          {success}
        </div>
      )}

      {/* Main Profile Visual Identity Card background */}
      <div className={`rounded-3xl border overflow-hidden bg-white dark:bg-stone-900 shadow-sm border-stone-200/60 dark:border-stone-800`}>
        
        {/* Dynamic Header background according to Team */}
        <div className={`h-32 bg-gradient-to-r ${teamData?.accent || 'from-stone-700 to-stone-900'} relative`} />

        {/* Content Details Block */}
        <div className="p-6 pt-0 relative">
          
          {/* Avatar floating head shot */}
          <div className="flex justify-between items-end -translate-y-12">
            <img 
              src={currentUser.avatarUrl} 
              alt="your avatar" 
              referrerPolicy="no-referrer"
              className="w-24 h-24 rounded-3xl object-cover bg-white dark:bg-stone-800 p-1.5 shadow-md border border-stone-100 dark:border-stone-800 h-24" 
            />
            
            <button
              id="btn-edit-profile-toggle"
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-250 dark:hover:bg-stone-700 border border-transparent rounded-xl text-stone-800 dark:text-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>

          {!isEditing ? (
            /* ====================================================================
               PROFILE VIEWER
               ==================================================================== */
            <div id="profile-detailed-view" className="-mt-8 space-y-5">
              
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-stone-950 dark:text-stone-50">{currentUser.trainerName}</h2>
                  {currentUser.isModerator && (
                    <span className="bg-red-500 text-white font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> MOD
                    </span>
                  )}
                  {currentUser.isAdmin && !currentUser.isModerator && (
                    <span className="bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider flex items-center gap-0.5">
                      <ShieldCheck className="h-3 w-3" /> ADMIN
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-400 font-mono mt-1">Level <strong className="text-red-500 font-bold">{currentUser.level || 30}</strong> &bull; Role: <strong className="text-stone-700 dark:text-stone-300">{currentUser.role}</strong></p>

                {currentUser.statusText && (
                  <p className="mt-3.5 p-3.5 bg-stone-50 dark:bg-stone-950 text-stone-600 dark:text-stone-300 rounded-2xl text-xs italic border border-stone-100 dark:border-stone-800/40">
                    " {currentUser.statusText} "
                  </p>
                )}
              </div>

              {/* Grid block for metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Copiable Trainer Code */}
                <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200/50 dark:border-stone-800 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest block">YOUR FRIEND CODE</span>
                    <span className="text-base font-bold text-stone-800 dark:text-stone-100 tracking-wider font-mono mt-2 block">
                      {formatTrainerCode(currentUser.gameCode)}
                    </span>
                  </div>

                  <button
                    id="btn-copy-personal-code"
                    onClick={handleCopyCode}
                    className="w-full py-1.5 bg-white hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-transform active:scale-95"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Code ID'}
                  </button>
                </div>

                {/* Score rating rank */}
                <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200/50 dark:border-stone-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-widest block">MEMBERSHIP TEAM</span>
                    <span className={`text-base font-black tracking-wide mt-2 block ${teamData?.text || 'text-stone-800'}`}>
                      {teamData?.logo || currentUser.team}
                    </span>
                  </div>

                  <div className="pt-2 text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Joined {new Date(currentUser.joinedAt).toLocaleDateString()}</span>
                  </div>
                </div>

              </div>

              {/* Hoster Score ratings and feedback rank */}
              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Star className="h-6 w-6 fill-current animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                      {getRankName(currentUser.rating || 0, currentUser.ratingCount || 0)}
                    </h3>
                    <p className="text-[11px] text-stone-400 mt-1">
                      Scores submitted by raiders who combat in your lobbies
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-2xl font-black text-amber-500 block leading-none">
                    ⭐ {currentUser.rating ? currentUser.rating.toFixed(1) : '5.0'}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono mt-1 block">
                    {currentUser.ratingCount || 0} reviews
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* ====================================================================
               PROFILE EDITOR FORM
               ==================================================================== */
            <form onSubmit={handleSave} className="-mt-8 space-y-5 animate-slideIn">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Configure Trainer Card</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Trainer Nickname</label>
                  <input 
                    id="input-edit-trainer-name"
                    type="text"
                    required
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Trainer Code ID (12 digits)</label>
                  <input 
                    id="input-edit-game-code"
                    type="text"
                    required
                    maxLength={14}
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Select Team</label>
                  <select
                    id="select-edit-team"
                    value={team}
                    onChange={(e) => setTeam(e.target.value as PokemonTeam)}
                    className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Valor">🔥 Team Valor (Red)</option>
                    <option value="Mystic">❄️ Team Mystic (Blue)</option>
                    <option value="Instinct">⚡ Team Instinct (Yellow)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Select Guild Role</label>
                  <select
                    id="select-edit-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as PlayerRole)}
                    className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                  >
                    <option value="Trainer">⚔️ Regular Gym Trainer</option>
                    <option value="Trader">🤝 Active Specimen Trader</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Game Level (1-80)</label>
                  <select
                    id="select-edit-level"
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
                  >
                    {Array.from({ length: 80 }, (_, i) => i + 1).map(lvl => (
                      <option key={lvl} value={lvl}>Level {lvl}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Upload New Avatar Photo</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-stone-200" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-[10px] text-stone-400 font-bold">PGO</div>
                    )}
                    <label className="flex-1 px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-bold text-stone-700 dark:text-stone-200 cursor-pointer text-center block transition-colors leading-normal">
                      Select Photo File
                      <input
                        id="profile-upload-avatar-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setAvatarUrl(reader.result as string);
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

              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Custom Slogan status</label>
                <input 
                  id="input-edit-status"
                  type="text"
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="e.g. Catching raid passes every day!"
                  className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none"
                />
              </div>

              {/* Custom Avatar Choice & Preset list */}
              <div>
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">Trainer Profile Photo URL <span className="text-[9px] text-stone-400 italic font-normal">(or use upload option above)</span></label>
                <input 
                  id="input-edit-avatar-url"
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Paste a custom photo URL"
                  className="w-full mt-1.5 px-3 py-2 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200 rounded-xl text-xs focus:outline-none mb-3"
                />

                <div className="space-y-1.5">
                  <span className="text-[9px] text-stone-400 font-bold block">OR TAP TO RE-ASSIGN AVATAR STicker PRESET:</span>
                  <div className="flex gap-2.5 overflow-x-auto py-1">
                    {AVATAR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`p-1.5 shrink-0 hover:scale-105 border rounded-xl bg-stone-50 dark:bg-stone-800 transition-all cursor-pointer ${avatarUrl === preset.url ? 'border-red-500 scale-105 ring-2 ring-red-100/40 dark:ring-red-950/20' : 'border-stone-200 dark:border-stone-700'}`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-12 h-12 rounded-lg object-cover h-12" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Controls */}
              <div className="border-t border-stone-100 dark:border-stone-800 pt-4 flex gap-2">
                <button
                  id="btn-edit-save"
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm text-center block transition-colors"
                >
                  {loading ? 'Saving Changes...' : 'Save Configuration'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-850 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

    </div>
  );
}
