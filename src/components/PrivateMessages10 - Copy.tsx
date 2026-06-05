/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, MessageCircle, User as UserIcon, ShieldAlert } from 'lucide-react';
import { User, PrivateMessage } from '../types';
import { TEAM_DETAILS } from '../utils';

interface PrivateMessagesProps {
  currentUser: User;
  targetUserFromOuterContext: User | null;
  onClearTargetOuterContext: () => void;
}

export default function PrivateMessages({ currentUser, targetUserFromOuterContext, onClearTargetOuterContext }: PrivateMessagesProps) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [activeRecipientId, setActiveRecipientId] = useState<string | null>(null);
  const [allPms, setAllPms] = useState<PrivateMessage[]>([]);
  const [newPm, setNewPm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [imageUrl, setImageUrl] = useState('');
  const pmsBottomRef = useRef<HTMLDivElement>(null);

  // Fetch registered players
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        // Filter out Ahmed from PM selections for regular users!
        // (But allow Ahmed to chat if he initiates or if the current user IS Ahmed!)
        let list = data;
        if (currentUser.id !== 'mod_ahmed') {
          list = data.filter((u: User) => u.id !== 'mod_ahmed');
        }
        setUsersList(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all DMs involving currentUser
  const fetchPrivateMessages = async () => {
    try {
      const res = await fetch(`/api/pms/${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setAllPms(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPrivateMessages();

    const interval = setInterval(() => {
      fetchPrivateMessages();
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Listen to outer requests (e.g., clicking PM from Members tab or Chat)
  useEffect(() => {
    if (targetUserFromOuterContext) {
      // Force selected contact
      setActiveRecipientId(targetUserFromOuterContext.id);
      // Double check they are in the selection list, if not (e.g. Ahmed), add them dynamically
      if (!usersList.some(u => u.id === targetUserFromOuterContext.id)) {
        setUsersList(prev => [...prev, targetUserFromOuterContext]);
      }
      onClearTargetOuterContext();
    }
  }, [targetUserFromOuterContext]);

  // Mark messages as read when active recipient opens
  useEffect(() => {
    if (!activeRecipientId) return;

    const markThreadAsRead = async () => {
      try {
        await fetch('/api/pms/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            otherUserId: activeRecipientId
          })
        });
      } catch (err) {
        console.error(err);
      }
    };

    markThreadAsRead();
  }, [activeRecipientId, allPms.length]);

  // Scroll viewport down on message updates
  useEffect(() => {
    pmsBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeRecipientId, allPms.length]);
const handlePmImageUpload = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const file = e.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onloadend = () => {
    setSelectedImage(reader.result as string);
  };

  reader.readAsDataURL(file);
};
  // Send Direct Message
  const handleSendPm = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPm.trim() && !imageUrl) || !activeRecipientId) return;

    try {
      const res = await fetch('/api/pms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  fromId: currentUser.id,
  toId: activeRecipientId,
  message: newPm,
  imageUrl: selectedImage || undefined
})
      });

      if (res.ok) {
        setNewPm('');
setSelectedImage('');
        fetchPrivateMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeContact = usersList.find(u => u.id === activeRecipientId);

  // Filter conversations for activeRecipientId
  const activeConversation = allPms.filter(
    pm => (pm.fromId === currentUser.id && pm.toId === activeRecipientId) ||
          (pm.fromId === activeRecipientId && pm.toId === currentUser.id)
  );

  // Compute unread badge counts per sender contact id
  const getUnreadCount = (senderId: string) => {
    return allPms.filter(pm => pm.fromId === senderId && pm.toId === currentUser.id && !pm.read).length;
  };

  return (
    <div
  id="private-messages-viewport"
  className="
    h-[calc(100vh-80px)]
    flex flex-col md:flex-row
    bg-white dark:bg-stone-900
    border border-stone-100 dark:border-stone-800
    rounded-2xl
    overflow-hidden
    shadow-sm
  "
>
      
      {/* LEFT SIDEBAR: Contact Threads panel */}
      <div
  id="pms-threads-list"
  className={`
    ${
      activeRecipientId
        ? "hidden md:flex"
        : "flex"
    }
    flex-col
    w-full
    md:w-[260px]
    md:border-r
    border-stone-200/60
    dark:border-stone-800/60
    bg-stone-50/50
    dark:bg-stone-950/40
    h-full
  `}
>
        <div className="p-4 bg-stone-50 border-b border-stone-200/60 dark:bg-stone-950 dark:border-stone-800">
          <h3 className="text-xs font-bold text-stone-800 dark:text-stone-200 uppercase tracking-wider leading-none">Trainers Mailbox</h3>
          <p className="text-[10px] text-stone-400 mt-1 leading-normal">Coordinate secure trade offers</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {usersList.filter(u => u.id !== currentUser.id).length === 0 ? (
            <p className="text-xs text-stone-400 text-center py-6 italic">No contacts found.</p>
          ) : (
            usersList
              .filter(u => u.id !== currentUser.id)
              .map(user => {
                const unread = getUnreadCount(user.id);
                const active = user.id === activeRecipientId;
                const teamData = TEAM_DETAILS[user.team];

                return (
                  <div
                    key={user.id}
                    onClick={() => setActiveRecipientId(user.id)}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between gap-1.5 ${active ? 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border' : 'hover:bg-white/40 dark:hover:bg-stone-900/40 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatarUrl}
                          alt="contact avatar"
                          referrerPolicy="no-referrer"
                          className="w-8.5 h-8.5 rounded-full object-cover border border-stone-200 dark:border-stone-700 h-8.5"
                        />
                        {user.onlineStatus && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-stone-800 rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
                          {user.trainerName}
                        </h4>
                        <p className={`text-[9px] font-mono leading-none mt-0.5 ${teamData?.text || 'text-stone-500'}`}>
                          {user.team} - {user.role}
                        </p>
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="bg-red-500 text-white font-bold leading-none px-2 py-1 text-[9px] rounded-full animate-pulse">
                        {unread}
                      </span>
                    )}
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* RIGHT CHAT LOG PANEL: Recipient dialog bubble view */}
     <div
  id="pms-dialog-view"
  className={`
    ${
      activeRecipientId
        ? "flex"
        : "hidden md:flex"
    }
    flex-1
    flex-col
    min-w-0
    overflow-hidden
    bg-stone-50/20
    dark:bg-stone-950/20
  `}
>
        
        {activeContact ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden justify-between">
            {/* Thread Recipient identity */}
            <div className="px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200/60 dark:border-stone-800/60 flex items-center justify-between">
              <div className="md:hidden mb-2">
  <button
    onClick={() => setActiveRecipientId(null)}
    className="text-xs font-bold text-red-500"
  >
    ← Back to Conversations
  </button>
</div>
			  <div className="flex items-center gap-2.5">
                <img
                  src={activeContact.avatarUrl}
                  alt="active recipient headshot"
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 h-8"
                />
                <div>
                  <h4 className="text-xs font-bold text-stone-900 dark:text-stone-50">{activeContact.trainerName}</h4>
                  <p className="text-[9px] text-stone-400 font-mono mt-0.5">Trainer ID: {activeContact.gameCode}</p>
                </div>
              </div>

              {activeContact.id === 'mod_ahmed' && (
                <span className="bg-amber-500/10 text-amber-500 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <ShieldAlert className="h-3 w-3" />
                  Ahmed (Moderator)
                </span>
              )}
            </div>

            {/* Bubble Thread stream view */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {activeConversation.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/40 dark:bg-stone-900/10 rounded-2xl m-4">
                  <MessageCircle className="h-8 w-8 text-stone-300 dark:text-stone-700 mb-2" />
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400">Direct Chat Connected</p>
                  <p className="text-[10px] text-stone-400 mt-1 max-w-[210px] leading-relaxed">
                    Say Hello! Swap direct coordinates, secret base coordinates, or set up secure Poke trades.
                  </p>
                </div>
              ) : (
                activeConversation.map(pm => {
                  const mine = pm.fromId === currentUser.id;
                  return (
                    <div key={pm.id} className={`flex gap-2 max-w-[85%] ${mine ? 'ml-auto flex-row-reverse' : ''}`}>
                      <img
                        src={mine ? currentUser.avatarUrl : activeContact.avatarUrl}
                        alt="avatar"
                        className="w-7.5 h-7.5 rounded-full object-cover border border-stone-200 dark:border-stone-700 shrink-0 h-7.5"
                      />
                      <div>
                        <div className={`mt-0.5 p-2.5 rounded-2xl text-xs break-words shadow-[0_1px_2px_rgba(0,0,0,0.01)] border ${mine ? 'bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950 border-transparent rounded-tr-sm' : 'bg-white text-stone-700 dark:bg-stone-900 dark:text-stone-300 border-stone-100 dark:border-stone-800 rounded-tl-sm'}`}>
                          {pm.message}

                          {pm.imageUrl && (
                            <img
                              src={pm.imageUrl}
                              alt="attached image"
                              referrerPolicy="no-referrer"
                              className="mt-2 rounded-xl max-h-[140px] max-w-full object-cover block"
                            />
                          )}
                        </div>
                        <p className={`text-[8px] text-stone-400 mt-1 ${mine ? 'text-right' : ''}`}>
                          {new Date(pm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {mine && (pm.read ? <span className="text-blue-500 font-semibold ml-1">✓ Read</span> : <span className="text-stone-300 dark:text-stone-600 ml-1">✓ Sent</span>)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
             <div ref={pmsBottomRef} />
</div>

{/* Image Preview */}
{selectedImage && (
  <div className="px-3 pb-2 bg-white dark:bg-stone-900">
    <img
      src={selectedImage}
      alt="preview"
      className="max-h-32 rounded-xl border border-stone-200 dark:border-stone-800"
    />
  </div>
)}


            {/* DM Form Input Controls bar */}
            <form
  onSubmit={handleSendPm}
  className="
    p-3
    bg-white
    border-t
    border-stone-200/60
    dark:bg-stone-900
    dark:border-stone-800
    flex
    flex-wrap
    gap-2
  "
>
             

              <div className="relative flex items-center shrink-0">
  <label
    <label
  htmlFor="pm-image-upload"
  className="cursor-pointer p-2 rounded-xl border border-stone-200 dark:border-stone-800"
>
  {selectedImage ? (
    <span className="text-green-500 font-bold text-sm">✓</span>
  ) : (
    <ImageIcon className="h-4 w-4 text-stone-500" />
  )}
</label>

  <input
    id="pm-image-upload"
    type="file"
    accept="image/*"
    className="hidden"
    onChange={handlePmImageUpload}
  />
</div>

              <button
                id="pm-btn-send"
                type="submit"
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-850 dark:bg-stone-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="p-4 bg-stone-100 dark:bg-stone-800/80 rounded-full text-stone-300 dark:text-stone-600 mb-3 animate-pulse">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm">Select A Conversation</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm">
              Touch any active contact on the sidebar to read direct messages, review trades, or begin typing.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
