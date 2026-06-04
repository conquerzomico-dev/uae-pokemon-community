/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MessageSquare, 
  Award, 
  UserPlus, 
  UserMinus, 
  ShieldCheck, 
  ChevronDown, 
  User as UserIcon, 
  Copy, 
  Check, 
  Star 
} from 'lucide-react';
import { User } from '../types';
import { TEAM_DETAILS, formatTrainerCode, copyToClipboard } from '../utils';

interface MembersTabProps {
  currentUser: User;
  onOpenDirectMessage: (user: User) => void;
  onOpenProfileOverlay: (user: User) => void;
}

export default function MembersTab({ currentUser, onOpenDirectMessage, onOpenProfileOverlay }: MembersTabProps) {
  const [members, setMembers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load all members from Express backend (Filtered to exclude Moderator secret)
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

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleCopyCode = async (code: string, id: string) => {
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // Toggle dropdown
  const toggleDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(openDropdownId === id ? null : id);
  };

  // Give/Remove Admin role (Moderator ONLY!)
  const handleToggleAdminRole = async (targetUser: User, makeAdmin: boolean) => {
    setLoading(true);
    try {
      const res = await fetch('/api/members/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: targetUser.id,
          makeAdmin,
          moderatorId: currentUser.id
        })
      });

      if (res.ok) {
        setOpenDropdownId(null);
        await fetchMembers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to modify role.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
const handleDeleteUser = async (targetUser: User) => {
  if (!window.confirm(`Delete ${targetUser.trainerName}?`)) {
    return;
  }

  try {
    const res = await fetch('/api/members/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetUserId: targetUser.id,
        moderatorId: currentUser.id
      })
    });

    if (res.ok) {
      await fetchMembers();
      setOpenDropdownId(null);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete user.');
    }
  } catch (err) {
    console.error(err);
  }
};
  // Dismiss dropdowns on document click
  useEffect(() => {
    const handleDocClick = () => {
      setOpenDropdownId(null);
    };
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, []);

  // Filtering Logic
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.trainerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.gameCode.includes(searchQuery) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTeam = selectedTeam === 'All' || m.team === selectedTeam;

    return matchesSearch && matchesTeam;
  });

  return (
    <div id="members-tab-container" className="h-[calc(100vh-140px)] flex flex-col bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
      
      {/* Search and Filters navigation bar */}
      <div className="p-4 bg-stone-50 border-b border-stone-200/60 dark:bg-stone-950 dark:border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative w-full sm:max-w-xs">
          <input
            id="member-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trainer, game code, role..."
            className="w-full pl-9 pr-3 py-1.5 border border-stone-200 bg-white dark:bg-stone-900 dark:border-stone-800 dark:text-stone-200 rounded-xl text-xs focus:outline-none focus:border-red-400"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
        </div>

        {/* Filter categories */}
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto justify-end py-0.5">
          {['All', 'Valor', 'Mystic', 'Instinct'].map(team => {
            const active = selectedTeam === team;
            return (
              <button
                key={team}
                onClick={() => setSelectedTeam(team)}
                className={`px-3 py-1 bg-stone-105 rounded-lg text-xs font-bold leading-none cursor-pointer transition-colors shrink-0 ${active ? 'bg-red-500 text-white shadow-sm' : 'bg-stone-100 hover:bg-stone-200 text-stone-600 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-205'}`}
              >
                {team === 'All' ? '🌐 All Teams' : team}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid List viewport */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center h-full flex flex-col items-center justify-center">
            <UserIcon className="h-10 w-10 text-stone-300 dark:text-stone-700 mb-2 animate-bounce" />
            <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm">No Members Located</h3>
            <p className="text-xs text-stone-400 max-w-sm mt-1">
              No matching trainers inside database. Clear search parameters to review full catalog list.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map(member => {
              const teamInfo = TEAM_DETAILS[member.team];
              return (
                <div 
                  key={member.id} 
                  id={`member-tile-${member.id}`}
                  className="p-4 bg-stone-50/55 dark:bg-stone-800/20 rounded-2xl border border-stone-200/50 dark:border-stone-800 flex items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.015)]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={member.avatarUrl} 
                      alt="member headshot" 
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-2xl object-cover bg-white dark:bg-stone-900 border border-stone-200/50 dark:border-stone-750/30 shrink-0 h-12" 
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 
                          onClick={() => onOpenProfileOverlay(member)}
                          className="font-bold text-stone-900 dark:text-stone-100 text-sm hover:underline cursor-pointer truncate"
                        >
                          {member.trainerName}
                        </h4>
                        
                        {member.isAdmin && (
                          <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded text-[8px] font-bold shrink-0 uppercase tracking-widest leading-none">
                            ADMIN
                          </span>
                        )}
                      </div>

                      {/* Team tag label */}
                      <span className={`text-[9px] font-mono leading-none font-bold mt-1 inline-block ${teamInfo?.text || 'text-stone-500'}`}>
                        {member.team} — {member.role}
                      </span>

                      {/* Spaced Friend code Display with click to copy action */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleCopyCode(member.gameCode, member.id)}
                          className="flex items-center gap-1.5 bg-white border border-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:border-stone-800 dark:hover:bg-stone-800 px-2 py-1 rounded-md text-[10px] font-mono text-stone-700 dark:text-stone-300 font-semibold cursor-pointer active:scale-95 transition-transform select-all"
                          title="Click to copy Trainer Code"
                        >
                          <span>{formatTrainerCode(member.gameCode)}</span>
                          {copiedId === member.id ? (
                            <Check className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <Copy className="h-3 w-3 text-stone-400 shrink-0" />
                          )}
                        </button>
                        {copiedId === member.id && (
                          <span className="text-green-500 text-[9px] font-semibold animate-fadeIn shrink-0">Copied!</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Dropdown context trigger */}
                  <div className="relative shrink-0">
                    <button
                      id={`member-action-${member.id}`}
                      onClick={(e) => toggleDropdown(member.id, e)}
                      className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-150 rounded-xl cursor-pointer"
                    >
                      <ChevronDown className="h-4 w-4 text-stone-500" />
                    </button>

                    <AnimatePresence>
                      {openDropdownId === member.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 5 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 5 }}
                          className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-850 rounded-xl shadow-lg py-1.5 z-40 text-xs text-left"
                          onClick={(e) => e.stopPropagation()} // Stop document dismissed
                        >
                          <button
                            onClick={() => { onOpenProfileOverlay(member); setOpenDropdownId(null); }}
                            className="w-full text-left px-3 py-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <Award className="h-3.5 w-3.5" />
                            View Profile
                          </button>
                          
                          <button
                            onClick={() => { onOpenDirectMessage(member); setOpenDropdownId(null); }}
                            className="w-full text-left px-3 py-1.5 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-semibold flex items-center gap-2 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Send PM
                          </button>


{/* MODERATOR ASSIGNED FUNCTIONALITY */}
{currentUser.isModerator && (
  <>
    {member.isAdmin ? (
      <button
        onClick={() => handleToggleAdminRole(member, false)}
        disabled={loading}
        className="w-full text-left py-1 text-rose-500 hover:underline leading-none flex items-center gap-1 cursor-pointer font-semibold"
      >
        <UserMinus className="h-3.5 w-3.5" />
        Remove Admin Role
      </button>
    ) : (
      <button
        onClick={() => handleToggleAdminRole(member, true)}
        disabled={loading}
        className="w-full text-left py-1 text-emerald-500 hover:underline leading-none flex items-center gap-1 cursor-pointer font-semibold"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Give Admin Role
      </button>
    )}

    <button
      onClick={() => handleDeleteUser(member)}
      disabled={loading}
      className="w-full text-left py-1 text-red-600 hover:underline leading-none flex items-center gap-1 cursor-pointer font-semibold mt-2"
    >
      🗑 Delete User
    </button>
  </>
)}

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>

);
}
