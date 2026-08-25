// app/server/[serverId]/ServerContent.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  ref, get, onValue, set, remove, update, push,
  onChildAdded, query, orderByChild, limitToLast,
} from "firebase/database";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  FaCommentAlt, FaFolder, FaPlus, FaTimes, FaArrowLeft, FaEllipsisV, FaLock,
  FaUser, FaTrash, FaEdit, FaSmile, FaImage,
  FaCrown, FaPencilAlt, FaServer, FaUsers, FaHome, FaBookOpen, FaCircle,
  FaHashtag, FaUserCog, FaPalette, FaUserTag, FaShieldAlt,
} from "react-icons/fa";
import dynamic from 'next/dynamic';
import Sidebar from "@/components/Sidebar";
import FormattedMessage from "@/components/FormattedMessage";

const EmojiPicker = dynamic(
  () => import('emoji-picker-react').then((mod) => mod.default),
  { ssr: false }
);

const GIPHY_KEY =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_GIPHY_KEY) ||
  "GlVGYHkr3WSBn87g1H4F";

interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

interface ServerData {
  id: string;
  name: string;
  icon: string | null;
  ownerID: string;
  members: Record<string, any>;
}

interface Channel {
  id: string;
  name: string;
  type: "text" | "read" | "category";
  categoryId: string | null;
  order: number;
  createdAt: number;
  createdBy: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  order: number;
  default: boolean;
  createdAt?: number;
}

interface Member {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string | null;
  status: string;
  lastSeen: number;
  isOwner: boolean;
  roleColor: string | null;
  roleName: string | null;
  roles: string[];
}

interface Message {
  id: string;
  type: string;
  text: string;
  authorId: string;
  author: string;
  username: string;
  photoURL: string | null;
  timestamp: number;
  edited: boolean;
  editedAt?: number;
  gifUrl?: string;
}

interface GifData {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface CategorizedChannel extends Channel {
  children: Channel[];
  isUncategorized?: boolean;
}

interface ServerContentProps {
  serverId: string;
}

export default function ServerContent({ serverId }: ServerContentProps) {
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [serverData, setServerData] = useState<ServerData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);

  const [selectedChannelId, setSelectedChannelId] = useState("home");
  const channelData = channels.find((c) => c.id === selectedChannelId) || null;
  const isHomeChannel = selectedChannelId === "home";

  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"text" | "read" | "category">("text");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");

  const [showServerSettings, setShowServerSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("general");
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState<string | File | null>(null);
  const [serverIconPreview, setServerIconPreview] = useState<string | null>(null);
  const [updatingServer, setUpdatingServer] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [editingRoleColor, setEditingRoleColor] = useState("#a78bfa");
  const [updatingRole, setUpdatingRole] = useState(false);

  const [openChannelMenu, setOpenChannelMenu] = useState<string | null>(null);
  const [moveMenuChannelId, setMoveMenuChannelId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState<GifData[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const emojiPanelRef = useRef<HTMLDivElement>(null);
  const gifPanelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gifRequestIdRef = useRef(0);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: FirebaseUser | null) => {
      if (!currentUser) { router.push("/"); return; }
      
      const mappedUser: AppUser = {
        uid: currentUser.uid,
        displayName: currentUser.displayName || null,
        email: currentUser.email || null,
        photoURL: currentUser.photoURL || null,
      };
      
      setUser(mappedUser);
      const userSnap = await get(ref(db, `users/${currentUser.uid}`));
      if (userSnap.exists()) {
        const data = userSnap.val();
        setUsername(data.username || "Usuário");
        setDisplayName(data.displayName || data.username || "Usuário");
        setPhotoURL(data.photoURL || null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Server data
  useEffect(() => {
    if (!serverId || !user) return;
    const unsub = onValue(ref(db, `servers/${serverId}`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setServerData({ id: serverId, ...data });
        setServerName(data.name || "");
        setServerIcon(data.icon || null);
        if (data.members?.[user.uid] || data.ownerID === user.uid) setIsMember(true);
        if (data.ownerID === user.uid) setIsOwner(true);
      } else router.push("/servers");
    });
    return () => unsub();
  }, [serverId, user, router]);

  // Roles
  useEffect(() => {
    if (!serverId) return;
    const unsub = onValue(ref(db, `servers/${serverId}/roles`), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        list.sort((a, b) => {
          if (a.default) return -1;
          if (b.default) return 1;
          return (a.order || 0) - (b.order || 0);
        });
        setRoles(list);
      } else {
        const defaultRole = {
          id: "everyone",
          name: "Everyone",
          color: "#a78bfa",
          permissions: ["read", "send"],
          order: 0,
          default: true,
        };
        set(ref(db, `servers/${serverId}/roles/everyone`), defaultRole);
        setRoles([defaultRole]);
      }
    });
    return () => unsub();
  }, [serverId]);

  // Members
  useEffect(() => {
    if (!serverId || !user || roles.length === 0) return;

    const membersRef = ref(db, `servers/${serverId}/members`);
    const unsub = onValue(membersRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) { setMembers([]); return; }

      const memberIds = Object.keys(data);
      const memberPromises = memberIds.map(async (uid) => {
        const userSnap = await get(ref(db, `users/${uid}`));
        const userData = userSnap.exists() ? userSnap.val() : {};

        const memberData = data[uid] || {};
        let userRoleIds = memberData.roles || [];

        const everyoneRole = roles.find(r => r.default === true);
        if (everyoneRole && !userRoleIds.includes(everyoneRole.id)) {
          userRoleIds = [...userRoleIds, everyoneRole.id];
          await update(ref(db, `servers/${serverId}/members/${uid}`), {
            roles: userRoleIds,
          });
        }

        let roleColor = null;
        let roleName = null;

        if (userRoleIds.length > 0 && roles.length > 0) {
          const userRoles = roles.filter(r => userRoleIds.includes(r.id));
          if (userRoles.length > 0) {
            const sortedRoles = [...userRoles].sort((a, b) => (b.order || 0) - (a.order || 0));
            const highestRole = sortedRoles[0];
            roleColor = highestRole.color || null;
            roleName = highestRole.name || null;
          }
        }

        const isOwnerUser = serverData?.ownerID === uid;

        return {
          uid,
          displayName: userData.displayName || userData.username || "Usuário",
          username: userData.username || "",
          photoURL: userData.photoURL || null,
          status: userData.status?.state || "offline",
          lastSeen: userData.status?.lastSeen || 0,
          isOwner: isOwnerUser,
          roleColor: roleColor,
          roleName: roleName,
          roles: userRoleIds,
        };
      });

      const list = await Promise.all(memberPromises);
      list.sort((a, b) => {
        if (a.isOwner && !b.isOwner) return -1;
        if (!a.isOwner && b.isOwner) return 1;
        const statusOrder = { online: 0, away: 1, offline: 2 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 2) - (statusOrder[b.status as keyof typeof statusOrder] || 2);
      });
      setMembers(list);
    });

    return () => unsub();
  }, [serverId, user, serverData?.ownerID, roles]);

  // Ensure all members have "everyone" role
  useEffect(() => {
    if (!serverId || !isOwner || roles.length === 0) return;

    const everyoneRole = roles.find(r => r.default === true);
    if (!everyoneRole) return;

    const membersRef = ref(db, `servers/${serverId}/members`);
    const unsub = onValue(membersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const updates: Record<string, any> = {};
      let hasChanges = false;

      Object.entries(data).forEach(([uid, memberData]: [string, any]) => {
        const userRoles = memberData.roles || [];
        if (!userRoles.includes(everyoneRole.id)) {
          updates[`${uid}/roles`] = [...userRoles, everyoneRole.id];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        update(ref(db, `servers/${serverId}/members`), updates);
      }
    });

    return () => unsub();
  }, [serverId, isOwner, roles]);

  // Listen for create channel event from Sidebar
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.serverId === serverId && isOwner) {
        setShowChannelModal(true);
      }
    };
    window.addEventListener("openCreateChannelModal" as any, handler);
    return () => window.removeEventListener("openCreateChannelModal" as any, handler);
  }, [serverId, isOwner]);

  // Channels list
  useEffect(() => {
    if (!serverId) return;
    const unsub = onValue(ref(db, `servers/${serverId}/channels`), (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })) : [];
      setChannels(list);
      if (selectedChannelId !== "home" && !list.some((c) => c.id === selectedChannelId)) {
        setSelectedChannelId("home");
      }
    });
    return () => unsub();
  }, [serverId, selectedChannelId]);

  // Messages
  useEffect(() => {
    setMessages([]);
    if (!serverId || !selectedChannelId || selectedChannelId === "home") return;

    const messagesRef = ref(db, `servers/${serverId}/channels/${selectedChannelId}/messages`);
    const messagesQuery = query(messagesRef, orderByChild("timestamp"), limitToLast(50));

    const unsub = onChildAdded(messagesQuery, (snapshot) => {
      const messageData = snapshot.val();
      if (!messageData) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === snapshot.key)) return prev;
        return [...prev, { id: snapshot.key as string, ...messageData }].sort((a, b) => a.timestamp - b.timestamp);
      });
    });
    return () => unsub();
  }, [serverId, selectedChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Click outside
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (showEmoji && emojiPanelRef.current && !emojiPanelRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
      if (showGif && gifPanelRef.current && !gifPanelRef.current.contains(e.target as Node)) {
        setShowGif(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showEmoji, showGif]);

  // Search GIFs
  const searchGifs = useCallback(async (q: string) => {
    const requestId = ++gifRequestIdRef.current;
    setGifLoading(true);
    setGifError("");
    try {
      const trimmed = q.trim();
      const endpoint = trimmed
        ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(trimmed)}&limit=30&rating=pg-13&lang=pt`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=30&rating=pg-13`;
      const res = await fetch(endpoint);
      const json = await res.json();

      if (gifRequestIdRef.current !== requestId) return;

      if (json.data) {
        setGifs(json.data.map((g: any) => ({
          id: g.id,
          url: g.images?.fixed_height?.url || g.images?.original?.url,
          preview: g.images?.fixed_height_small?.url || g.images?.preview_gif?.url || g.images?.fixed_height?.url,
          title: g.title,
        })));
      } else {
        setGifs([]);
      }
    } catch (err) {
      if (gifRequestIdRef.current !== requestId) return;
      console.error("Erro ao buscar GIFs:", err);
      setGifs([]);
      setGifError("Não foi possível buscar GIFs agora");
    } finally {
      if (gifRequestIdRef.current === requestId) setGifLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showGif) return;
    const handle = setTimeout(
      () => { searchGifs(gifQuery); },
      gifQuery.trim() ? 400 : 0
    );
    return () => clearTimeout(handle);
  }, [showGif, gifQuery, searchGifs]);

  const handleGifSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchGifs(gifQuery);
  };

  const clearGifSearch = () => setGifQuery("");

  // Channel handlers
  const handleChannelClick = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel?.type === "text" || channel?.type === "read") setSelectedChannelId(channelId);
  };

  const toggleChannelMenu = (channelId: string) => {
    if (!isOwner) return;
    setOpenChannelMenu(openChannelMenu === channelId ? null : channelId);
  };

  const handleCreateChannel = async () => {
    if (!isOwner) { alert("Apenas o dono do servidor pode criar canais."); return; }
    if (!channelName.trim()) { setChannelError("Digite um nome para o canal"); return; }

    if ((channelType === "text" || channelType === "read") && !selectedCategoryId) {
      setChannelError("Selecione uma categoria para o canal");
      return;
    }

    if (channelType === "category") {
      setSelectedCategoryId("");
    }

    setCreatingChannel(true);
    setChannelError("");
    try {
      const channelId = "ch_" + Date.now() + Math.random().toString(36).substring(2, 7);
      await set(ref(db, `servers/${serverId}/channels/${channelId}`), {
        id: channelId,
        name: channelName.trim(),
        type: channelType,
        categoryId: (channelType === "text" || channelType === "read") ? selectedCategoryId : null,
        order: Date.now(),
        createdAt: Date.now(),
        createdBy: user?.uid || "",
      });
      setChannelName("");
      setShowChannelModal(false);
      if (channelType === "text" || channelType === "read") setSelectedChannelId(channelId);
    } catch (error) {
      console.error(error);
      setChannelError("Erro ao criar canal. Tente novamente.");
    } finally {
      setCreatingChannel(false);
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!isOwner) return;
    if (!confirm("Tem certeza que deseja deletar este canal?")) return;
    try {
      await remove(ref(db, `servers/${serverId}/channels/${channelId}`));
      setOpenChannelMenu(null);
      if (selectedChannelId === channelId) setSelectedChannelId("home");
    } catch (error) {
      alert("Erro ao deletar canal.");
    }
  };

  const handleRenameChannel = async (channelId: string) => {
    if (!isOwner) return;
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    const newName = prompt("Novo nome do canal:", channel.name);
    if (!newName?.trim()) return;
    try {
      await update(ref(db, `servers/${serverId}/channels/${channelId}`), { name: newName.trim() });
      setOpenChannelMenu(null);
    } catch (error) {
      alert("Erro ao renomear canal.");
    }
  };

  const handleMoveChannelUp = async (channelId: string, categoryId: string | null) => {
    if (!isOwner) return;
    const siblings = channels
      .filter((c) => (c.categoryId || null) === (categoryId || null) && (c.type === "text" || c.type === "read"))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex((c) => c.id === channelId);
    if (idx <= 0) return;
    const curr = siblings[idx];
    const prev = siblings[idx - 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = prev.order || 0;
      updates[`${prev.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/channels`), updates);
      setOpenChannelMenu(null);
    } catch (error) {
      console.error("Erro ao mover canal para cima:", error);
    }
  };

  const handleMoveChannelDown = async (channelId: string, categoryId: string | null) => {
    if (!isOwner) return;
    const siblings = channels
      .filter((c) => (c.categoryId || null) === (categoryId || null) && (c.type === "text" || c.type === "read"))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = siblings.findIndex((c) => c.id === channelId);
    if (idx < 0 || idx >= siblings.length - 1) return;
    const curr = siblings[idx];
    const next = siblings[idx + 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = next.order || 0;
      updates[`${next.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/channels`), updates);
      setOpenChannelMenu(null);
    } catch (error) {
      console.error("Erro ao mover canal para baixo:", error);
    }
  };

  const handleMoveCategoryUp = async (categoryId: string) => {
    if (!isOwner) return;
    const categories = channels
      .filter((c) => c.type === "category")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx <= 0) return;
    const curr = categories[idx];
    const prev = categories[idx - 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = prev.order || 0;
      updates[`${prev.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/channels`), updates);
      setOpenChannelMenu(null);
    } catch (error) {
      console.error("Erro ao mover categoria para cima:", error);
    }
  };

  const handleMoveCategoryDown = async (categoryId: string) => {
    if (!isOwner) return;
    const categories = channels
      .filter((c) => c.type === "category")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = categories.findIndex((c) => c.id === categoryId);
    if (idx < 0 || idx >= categories.length - 1) return;
    const curr = categories[idx];
    const next = categories[idx + 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = next.order || 0;
      updates[`${next.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/channels`), updates);
      setOpenChannelMenu(null);
    } catch (error) {
      console.error("Erro ao mover categoria para baixo:", error);
    }
  };

  const handleMoveChannelToCategory = async (channelId: string, targetCategoryId: string) => {
    if (!isOwner) return;
    const channel = channels.find((c) => c.id === channelId);
    if (!channel || channel.categoryId === targetCategoryId) return;
    try {
      const targetChannels = channels
        .filter((c) => c.categoryId === targetCategoryId && (c.type === "text" || c.type === "read"))
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const lastOrder = targetChannels.length > 0
        ? (targetChannels[targetChannels.length - 1].order || 0) + 1
        : 0;
      await update(ref(db, `servers/${serverId}/channels/${channelId}`), {
        categoryId: targetCategoryId,
        order: lastOrder,
      });
      setOpenChannelMenu(null);
      setMoveMenuChannelId(null);
    } catch (error) {
      console.error("Erro ao mover canal:", error);
      alert("Erro ao mover canal.");
    }
  };

  // Role handlers
  const handleAddRole = async () => {
    if (!isOwner) return;
    const roleName = prompt("Digite o nome do novo cargo:");
    if (!roleName?.trim()) return;

    try {
      const roleId = "role_" + Date.now() + Math.random().toString(36).substring(2, 7);
      const maxOrder = roles.reduce((max, r) => Math.max(max, r.order || 0), 0);
      const newRole = {
        id: roleId,
        name: roleName.trim(),
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        permissions: ["read"],
        order: maxOrder + 1,
        default: false,
        createdAt: Date.now(),
      };
      await set(ref(db, `servers/${serverId}/roles/${roleId}`), newRole);
    } catch (error) {
      console.error("Erro ao criar cargo:", error);
      alert("Erro ao criar cargo.");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find(r => r.id === roleId);
    if (role?.default) {
      alert("Não é possível deletar o cargo padrão (Everyone).");
      return;
    }
    if (!confirm(`Tem certeza que deseja deletar o cargo "${role?.name}"?`)) return;
    try {
      await remove(ref(db, `servers/${serverId}/roles/${roleId}`));
      if (editingRoleId === roleId) {
        setEditingRoleId(null);
        setEditingRoleName("");
        setEditingRoleColor("#a78bfa");
      }
    } catch (error) {
      console.error("Erro ao deletar cargo:", error);
      alert("Erro ao deletar cargo.");
    }
  };

  const handleStartEditRole = (role: Role) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingRoleColor(role.color || "#a78bfa");
  };

  const handleCancelEditRole = () => {
    setEditingRoleId(null);
    setEditingRoleName("");
    setEditingRoleColor("#a78bfa");
  };

  const handleSaveRole = async () => {
    if (!isOwner || !editingRoleId) return;
    if (!editingRoleName.trim()) {
      alert("Digite um nome para o cargo.");
      return;
    }

    setUpdatingRole(true);
    try {
      await update(ref(db, `servers/${serverId}/roles/${editingRoleId}`), {
        name: editingRoleName.trim(),
        color: editingRoleColor,
      });
      setEditingRoleId(null);
      setEditingRoleName("");
      setEditingRoleColor("#a78bfa");
    } catch (error) {
      console.error("Erro ao atualizar cargo:", error);
      alert("Erro ao atualizar cargo.");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleMoveRoleUp = async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find(r => r.id === roleId);
    if (role?.default) return;

    const sortedRoles = [...roles]
      .filter(r => !r.default)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sortedRoles.findIndex((r) => r.id === roleId);
    if (idx <= 0) return;
    const curr = sortedRoles[idx];
    const prev = sortedRoles[idx - 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = prev.order || 0;
      updates[`${prev.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/roles`), updates);
    } catch (error) {
      console.error("Erro ao mover cargo:", error);
    }
  };

  const handleMoveRoleDown = async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find(r => r.id === roleId);
    if (role?.default) return;

    const sortedRoles = [...roles]
      .filter(r => !r.default)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = sortedRoles.findIndex((r) => r.id === roleId);
    if (idx < 0 || idx >= sortedRoles.length - 1) return;
    const curr = sortedRoles[idx];
    const next = sortedRoles[idx + 1];
    try {
      const updates: Record<string, any> = {};
      updates[`${curr.id}/order`] = next.order || 0;
      updates[`${next.id}/order`] = curr.order || 0;
      await update(ref(db, `servers/${serverId}/roles`), updates);
    } catch (error) {
      console.error("Erro ao mover cargo:", error);
    }
  };

  const handleAssignRole = async (memberId: string, roleId: string) => {
    if (!isOwner) return;

    const member = members.find(m => m.uid === memberId);
    if (!member) return;

    const currentRoles = member.roles || [];
    let newRoles: string[];

    if (currentRoles.includes(roleId)) {
      newRoles = currentRoles.filter(id => id !== roleId);
    } else {
      newRoles = [...currentRoles, roleId];
    }

    try {
      await update(ref(db, `servers/${serverId}/members/${memberId}`), {
        roles: newRoles,
      });
    } catch (error) {
      console.error("Erro ao atribuir cargo:", error);
      alert("Erro ao atribuir cargo.");
    }
  };

  // Server update handlers
  const handleServerIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setServerIconPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setServerIcon(file);
  };

  const handleUpdateServer = async () => {
    if (!isOwner) return;
    if (!serverName.trim()) { alert("Digite um nome para o servidor"); return; }

    setUpdatingServer(true);
    try {
      const updates: Record<string, any> = { name: serverName.trim() };

      if (serverIcon && typeof serverIcon !== 'string') {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(serverIcon);
        });
        updates.icon = base64;
      }

      await update(ref(db, `servers/${serverId}`), updates);
      setShowServerSettings(false);
      setServerIconPreview(null);
      setServerIcon(null);
    } catch (error) {
      console.error("Erro ao atualizar servidor:", error);
      alert("Erro ao atualizar servidor.");
    } finally {
      setUpdatingServer(false);
    }
  };

  // Message handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannelId || sending || isHomeChannel || !user) return;

    const currentChannel = channels.find((c) => c.id === selectedChannelId);
    if (currentChannel?.type === "read" && !isOwner) {
      alert("Apenas o dono do servidor pode enviar mensagens neste canal.");
      return;
    }

    setSending(true);
    try {
      const messagesRef = ref(db, `servers/${serverId}/channels/${selectedChannelId}/messages`);
      const newMessageRef = push(messagesRef);
      await set(newMessageRef, {
        type: "text",
        text: newMessage.trim(),
        authorId: user.uid,
        author: displayName,
        username,
        photoURL: photoURL || null,
        timestamp: Date.now(),
        edited: false,
      });
      setNewMessage("");
      setShowEmoji(false);
      setShowGif(false);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const insertGif = (gif: GifData) => {
    if (!gif?.url || sending || isHomeChannel || !user) return;
    const currentChannel = channels.find((c) => c.id === selectedChannelId);
    if (currentChannel?.type === "read" && !isOwner) {
      alert("Apenas o dono do servidor pode enviar mensagens neste canal.");
      return;
    }
    const token = `![gif](${gif.url})`;
    const el = inputRef.current;
    const start = el && typeof el.selectionStart === "number" ? el.selectionStart : newMessage.length;
    const end = el && typeof el.selectionEnd === "number" ? el.selectionEnd : newMessage.length;

    const before = newMessage.slice(0, start);
    const after = newMessage.slice(end);
    const prefix = before && !/\s$/.test(before) ? " " : "";
    const suffix = after && !/^\s/.test(after) ? " " : "";
    const insertion = `${prefix}${token}${suffix}`;
    const newValue = before + insertion + after;
    const cursorPos = (before + insertion).length;

    setNewMessage(newValue);

    requestAnimationFrame(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(cursorPos, cursorPos);
      }
    });
  };

  const insertEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editText.trim()) return;
    try {
      await update(ref(db, `servers/${serverId}/channels/${selectedChannelId}/messages/${messageId}`), {
        text: editText.trim(),
        edited: true,
        editedAt: Date.now(),
      });
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao editar mensagem:", error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Tem certeza que deseja deletar esta mensagem?")) return;
    try {
      await remove(ref(db, `servers/${serverId}/channels/${selectedChannelId}/messages/${messageId}`));
    } catch (error) {
      console.error("Erro ao deletar mensagem:", error);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatDateSeparator = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === now.toDateString()) {
      return "Hoje";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
    }
  };

  // Group channels by category
  const getChannelsByCategory = (): CategorizedChannel[] => {
    const categories = channels.filter((c) => c.type === "category").sort((a, b) => (a.order || 0) - (b.order || 0));
    const texts = channels.filter((c) => c.type === "text" || c.type === "read");
    const result: CategorizedChannel[] = [];

    categories.forEach((cat) => {
      result.push({
        ...cat,
        children: texts
          .filter((t) => t.categoryId === cat.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0)),
      });
    });

    const uncategorized = texts
      .filter((t) => !t.categoryId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (uncategorized.length > 0) {
      result.push({
        id: "uncategorized",
        name: "Sem categoria",
        type: "category",
        isUncategorized: true,
        children: uncategorized,
        categoryId: null,
        order: 999,
        createdAt: Date.now(),
        createdBy: "",
      });
    }

    return result;
  };

  if (loading || !serverData || !user) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm ml-[68px] w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
          <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
          <p>Carregando...</p>
        </div>
      </>
    );
  }

  if (!isMember) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen min-h-dvh flex items-center justify-center ml-[68px] w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
          <div className="bg-white/2 backdrop-blur-xl border border-white/6 rounded-2xl p-12 text-center max-w-md">
            <div className="text-4xl text-[#7a6a9a] mb-4"><FaLock /></div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-2xl font-bold text-[#f0ebff] m-0">Acesso restrito</h2>
            <p className="text-sm text-[#b8a8d9] my-3">Você não é membro deste servidor.</p>
            <button
              type="button"
              className="px-6 py-2.5 bg-white/6 border border-white/6 rounded-xl text-[#f0ebff] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-white/10"
              onClick={() => router.push("/servers")}
            >
              Voltar para servidores
            </button>
          </div>
        </div>
      </>
    );
  }

  const categorizedChannels = getChannelsByCategory();

  return (
    <>
      <Sidebar />
      <div className="min-h-screen min-h-dvh overflow-hidden text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] ml-[68px] w-[calc(100%-68px)] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        <div className="flex h-screen h-dvh">

          {/* Channel Sidebar */}
          <aside className="w-[260px] min-w-[260px] h-full bg-[rgba(255,255,255,0.02)] border-r border-[rgba(255,255,255,0.04)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
              <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] truncate">{serverData?.name}</span>
              {isOwner && (
                <button
                  type="button"
                  className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                  onClick={() => setShowServerSettings(true)}
                  title="Configurações"
                >
                  <FaCrown />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* Home */}
              <div className="mb-1">
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] cursor-pointer transition-all duration-200 ${isHomeChannel ? 'bg-[rgba(167,139,250,0.12)]' : 'hover:bg-[rgba(255,255,255,0.04)]'}`}
                  onClick={() => setSelectedChannelId("home")}
                >
                  <FaHome className="text-[#7a6a9a] text-sm" />
                  <span className="text-sm font-medium text-[#f0ebff]">Início</span>
                </div>
              </div>

              {categorizedChannels.map((category) => (
                <div key={category.id} className="mb-2 relative">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-bold uppercase text-[#7a6a9a] tracking-wide">
                    <FaFolder className="text-[10px]" />
                    <span className="flex-1">{category.name}</span>
                    {isOwner && !category.isUncategorized && (
                      <button
                        type="button"
                        className="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[10px] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                        onClick={(e) => { e.stopPropagation(); toggleChannelMenu(category.id); }}
                      >
                        <FaEllipsisV />
                      </button>
                    )}
                    {openChannelMenu === category.id && isOwner && (
                      <div className="absolute z-10 min-w-[180px] bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 right-0 top-full mt-1">
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleRenameChannel(category.id); }}>
                          ✏️ Renomear
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleMoveCategoryUp(category.id); }}>
                          ▲ Mover para cima
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleMoveCategoryDown(category.id); }}>
                          ▼ Mover para baixo
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f87171] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(247,84,110,0.08)]" onClick={(e) => { e.stopPropagation(); handleDeleteChannel(category.id); }}>
                          🗑️ Deletar
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {category.children.map((channel) => (
                      <div key={channel.id} className="relative">
                        <div
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] cursor-pointer transition-all duration-200 ${selectedChannelId === channel.id ? 'bg-[rgba(167,139,250,0.12)]' : 'hover:bg-[rgba(255,255,255,0.04)]'}`}
                          onClick={() => handleChannelClick(channel.id)}
                        >
                          {channel.type === "read" ? (
                            <FaBookOpen className="text-[#7a6a9a] text-xs" />
                          ) : (
                            <FaCommentAlt className="text-[#7a6a9a] text-xs" />
                          )}
                          <span className="flex-1 text-sm font-medium text-[#f0ebff] truncate">{channel.name}</span>
                          {channel.type === "read" && (
                            <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded">
                              <FaLock /> Leitura
                            </span>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              className="flex items-center justify-center w-6 h-6 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[10px] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                              onClick={(e) => { e.stopPropagation(); toggleChannelMenu(channel.id); }}
                            >
                              <FaEllipsisV />
                            </button>
                          )}
                          {openChannelMenu === channel.id && isOwner && (
                            <div className="absolute z-10 min-w-[180px] bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 right-0 top-full mt-1">
                              <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleRenameChannel(channel.id); }}>
                                ✏️ Renomear
                              </button>
                              <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleMoveChannelUp(channel.id, category.id); }}>
                                ▲ Mover para cima
                              </button>
                              <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); handleMoveChannelDown(channel.id, category.id); }}>
                                ▼ Mover para baixo
                              </button>
                              <div className="relative">
                                <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={(e) => { e.stopPropagation(); setMoveMenuChannelId(moveMenuChannelId === channel.id ? null : channel.id); }}>
                                  ➤ Mover para categoria {moveMenuChannelId === channel.id ? "▲" : "▼"}
                                </button>
                                {moveMenuChannelId === channel.id && (
                                  <div className="absolute left-full top-0 ml-1 min-w-[160px] bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1">
                                    {channels.filter((c) => c.type === "category" && c.id !== channel.categoryId).map((cat) => (
                                      <button
                                        key={cat.id}
                                        type="button"
                                        className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
                                        onClick={(e) => { e.stopPropagation(); handleMoveChannelToCategory(channel.id, cat.id); }}
                                      >
                                        <FaFolder className="text-[#7a6a9a] text-xs" /> {cat.name}
                                      </button>
                                    ))}
                                    {channels.filter((c) => c.type === "category" && c.id !== channel.categoryId).length === 0 && (
                                      <span className="block px-3 py-2 text-[#7a6a9a] text-sm">Nenhuma outra categoria</span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f87171] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(247,84,110,0.08)]" onClick={(e) => { e.stopPropagation(); handleDeleteChannel(channel.id); }}>
                                🗑️ Deletar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {channels.filter(c => c.type === "text" || c.type === "read").length === 0 && (
                <div className="text-center py-8 px-4">
                  <p className="text-sm text-[#b8a8d9] m-0">Nenhum canal ainda</p>
                  <span className="text-xs text-[#7a6a9a]">{isOwner ? "Clique em + para criar" : "Aguardando o dono criar canais"}</span>
                </div>
              )}
            </div>

            {/* Create Channel Button */}
            {isOwner && (
              <div className="flex-shrink-0 p-2 border-t border-[rgba(255,255,255,0.04)]">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(167,139,250,0.3)]"
                  onClick={() => setShowChannelModal(true)}
                >
                  <FaPlus /> Criar canal
                </button>
              </div>
            )}
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-[rgba(255,255,255,0.01)] overflow-hidden">
            {isHomeChannel ? (
              // Server Home Page
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-4xl font-bold shadow-[0_8px_32px_rgba(167,139,250,0.25)] mb-5 overflow-hidden flex-shrink-0">
                  {typeof serverIcon === 'string' ? (
                    <img src={serverIcon} alt={serverData.name} className="w-full h-full object-cover" />
                  ) : (
                    serverData.name?.charAt(0).toUpperCase() || "S"
                  )}
                </div>
                <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-3xl font-bold text-[#f0ebff] m-0">
                  {serverData.name}
                </h1>
                <p className="text-sm text-[#b8a8d9] mt-2">
                  {isOwner ? "👑 Você é o dono deste servidor" : "Você é membro deste servidor"}
                </p>
                <div className="flex gap-6 mt-3 text-sm text-[#7a6a9a]">
                  <span className="flex items-center gap-2">
                    <FaUsers className="text-[#a78bfa]" />
                    {Object.keys(serverData.members || {}).length} membros
                  </span>
                  <span className="flex items-center gap-2">
                    <FaCommentAlt className="text-[#a78bfa]" />
                    {channels.filter(c => c.type === "text" || c.type === "read").length} canais
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  {isOwner && (
                    <button
                      type="button"
                      className="px-6 py-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold font-inherit cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] flex items-center gap-2"
                      onClick={() => setShowServerSettings(true)}
                    >
                      <FaCrown /> Configurar servidor
                    </button>
                  )}
                  {channels.filter(c => c.type === "text" || c.type === "read").length === 0 && isOwner && (
                    <button
                      type="button"
                      className="px-6 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-xl text-[#f0ebff] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2"
                      onClick={() => setShowChannelModal(true)}
                    >
                      <FaPlus /> Criar primeiro canal
                    </button>
                  )}
                </div>
                {channels.filter(c => c.type === "text" || c.type === "read").length === 0 && !isOwner && (
                  <div className="mt-6 flex items-center gap-2 text-[#7a6a9a] text-sm bg-[rgba(255,255,255,0.03)] px-5 py-3 rounded-xl border border-[rgba(255,255,255,0.04)]">
                    <FaLock className="text-[#fbbf24]" />
                    <span>O dono ainda não criou canais</span>
                  </div>
                )}
              </div>
            ) : (
              // Channel View
              <div className="flex flex-col h-full">
                {/* Channel Header */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button
                      className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                      onClick={() => setSelectedChannelId("home")}
                      title="Voltar para o início"
                    >
                      <FaArrowLeft />
                    </button>
                    {channelData?.type === "read" ? (
                      <FaBookOpen className="text-[#7a6a9a] text-sm" />
                    ) : (
                      <FaCommentAlt className="text-[#7a6a9a] text-sm" />
                    )}
                    <span className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff]">{channelData?.name}</span>
                    {channelData?.type === "read" && (
                      <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded">
                        <FaLock /> Leitura
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="text-4xl mb-4 opacity-50">💬</div>
                      <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-2xl font-bold text-[#f0ebff] m-0"># {channelData?.name}</h2>
                      <p className="text-sm text-[#b8a8d9] mt-2">Bem-vindo ao canal <strong>{channelData?.name}</strong>!</p>
                      <p className="text-xs text-[#7a6a9a]">Seja o primeiro a enviar uma mensagem.</p>
                    </div>
                  ) : (
                    (() => {
                      let lastDate: string | null = null;
                      return messages.map((msg, index) => {
                        const isCurrentUser = msg.authorId === user?.uid;
                        const isGif = msg.type === "gif" && msg.gifUrl;

                        const msgDate = new Date(msg.timestamp).toDateString();
                        const showDateSeparator = lastDate !== msgDate;
                        if (showDateSeparator) lastDate = msgDate;

                        const prevMsg = index > 0 ? messages[index - 1] : null;
                        const isSameAuthor = prevMsg && prevMsg.authorId === msg.authorId;
                        const isSameDay = prevMsg && new Date(prevMsg.timestamp).toDateString() === new Date(msg.timestamp).toDateString();

                        const showAvatar = !isSameAuthor || !isSameDay;
                        const showName = !isSameAuthor || !isSameDay;
                        const showTimestamp = !isSameAuthor || !isSameDay ||
                          (prevMsg && (msg.timestamp - prevMsg.timestamp) > 15 * 60 * 1000);

                        const msgAuthor = members.find(m => m.uid === msg.authorId);
                        const authorColor = msgAuthor?.roleColor || "#f0ebff";

                        return (
                          <React.Fragment key={msg.id}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-4">
                                <span className="text-xs font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-3 py-1 rounded-full border border-[rgba(255,255,255,0.04)]">
                                  {formatDateSeparator(msg.timestamp)}
                                </span>
                              </div>
                            )}
                            <div className={`flex items-start gap-3 py-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                              <div className="flex-shrink-0">
                                {showAvatar ? (
                                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xs font-bold uppercase overflow-hidden">
                                    {msg.photoURL ? (
                                      <img src={msg.photoURL} alt={msg.author} className="w-full h-full object-cover" loading="lazy" />
                                    ) : (
                                      <FaUser />
                                    )}
                                  </div>
                                ) : (
                                  <div className="w-9 h-9 flex-shrink-0" />
                                )}
                              </div>
                              <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : ''}`}>
                                {(showName || showTimestamp) && (
                                  <div className={`flex items-center gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                    {showName && (
                                      <span className="text-sm font-bold" style={{ color: authorColor }}>
                                        {msg.author}
                                      </span>
                                    )}
                                    {showName && msg.username && (
                                      <span className="text-xs text-[#7a6a9a]">@{msg.username || msg.author}</span>
                                    )}
                                    {showTimestamp && (
                                      <span className="text-xs text-[#7a6a9a]">{formatTimestamp(msg.timestamp)}</span>
                                    )}
                                  </div>
                                )}
                                {editingId === msg.id ? (
                                  <input
                                    className="w-full px-3 py-1.5 bg-[rgba(255,255,255,0.06)] border border-[#a78bfa] rounded-lg text-[#f0ebff] text-sm font-inherit outline-none"
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    onBlur={() => handleEditMessage(msg.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleEditMessage(msg.id);
                                      if (e.key === "Escape") setEditingId(null);
                                    }}
                                    autoFocus
                                  />
                                ) : isGif ? (
                                  <div className="mt-1">
                                    <img src={msg.gifUrl} alt={msg.text} className="max-w-[260px] max-h-[220px] rounded-lg object-cover" loading="lazy" />
                                    {msg.edited && <span className="text-xs text-[#7a6a9a] italic ml-2">(editado)</span>}
                                  </div>
                                ) : (
                                  <div className="mt-0.5">
                                    <FormattedMessage text={msg.text} />
                                    {msg.edited && <span className="text-xs text-[#7a6a9a] italic ml-2">(editado)</span>}
                                  </div>
                                )}
                                {isCurrentUser && !editingId && (
                                  <div className={`flex gap-1 mt-1 ${isCurrentUser ? 'justify-end' : ''}`}>
                                    <button
                                      className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                                      onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                                      title="Editar"
                                    >
                                      <FaEdit />
                                    </button>
                                    <button
                                      className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(247,84,110,0.08)] hover:text-[#f87171]"
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      title="Excluir"
                                    >
                                      <FaTrash />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {!isHomeChannel && (
                  <div className="relative flex-shrink-0 border-t border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] px-4 py-3">
                    {showEmoji && (
                      <div className="absolute bottom-full left-3 right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-[rgba(255,255,255,0.06)] rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50" ref={emojiPanelRef}>
                        <EmojiPicker
                          onEmojiClick={(emojiData: any) => insertEmoji(emojiData.emoji)}
                          width="100%"
                          height={320}
                          searchPlaceHolder="Buscar emoji..."
                          previewConfig={{ showPreview: false }}
                          skinTonesDisabled
                          lazyLoadEmojis
                          style={{
                            backgroundColor: "#1a0c28",
                            border: "none",
                            boxShadow: "none",
                          }}
                        />
                      </div>
                    )}

                    {showGif && (
                      <div className="absolute bottom-full left-3 right-3 max-w-[420px] max-h-[320px] bg-[#1a0c28] border border-[rgba(255,255,255,0.06)] rounded-[18px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden z-50" ref={gifPanelRef}>
                        <form className="flex items-center gap-2 p-2.5 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0" onSubmit={handleGifSearch}>
                          <input
                            type="text"
                            placeholder="Buscar GIFs..."
                            className="flex-1 h-9 px-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)] rounded-[6px] text-[#f0ebff] text-sm font-inherit outline-none min-w-0 placeholder:text-[#7a6a9a] focus:border-[#a78bfa]"
                            value={gifQuery}
                            onChange={(e) => setGifQuery(e.target.value)}
                            autoFocus
                          />
                          {gifQuery && (
                            <button
                              type="button"
                              className="flex items-center justify-center w-7 h-7 flex-shrink-0 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[0.7rem] cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f87171]"
                              onClick={clearGifSearch}
                              title="Limpar busca"
                            >
                              <FaTimes />
                            </button>
                          )}
                          <button type="submit" className="h-9 px-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-[6px] text-white text-sm font-bold font-inherit cursor-pointer whitespace-nowrap">
                            Buscar
                          </button>
                        </form>
                        {!gifQuery.trim() && !gifLoading && gifs.length > 0 && (
                          <p className="m-0 px-2.5 pt-2 text-[0.7rem] font-bold text-[#7a6a9a] uppercase tracking-wide">🔥 Em alta agora</p>
                        )}
                        <div className="grid grid-cols-3 gap-1.5 p-2.5 overflow-y-auto flex-1 min-h-[140px]">
                          {gifLoading ? (
                            <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">Carregando GIFs...</div>
                          ) : gifError ? (
                            <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">{gifError}</div>
                          ) : gifs.length === 0 ? (
                            <div className="col-span-3 text-center py-6 text-[#7a6a9a] text-sm">
                              {gifQuery.trim()
                                ? `Nenhum GIF encontrado para "${gifQuery.trim()}"`
                                : "Nenhum GIF encontrado"}
                            </div>
                          ) : (
                            gifs.map((g) => (
                              <button
                                key={g.id}
                                type="button"
                                className="relative aspect-square border-none rounded-[6px] overflow-hidden p-0 cursor-pointer bg-[rgba(255,255,255,0.04)] transition-all duration-150 hover:scale-105 hover:shadow-[0_0_0_2px_#a78bfa]"
                                onClick={() => insertGif(g)}
                                title={g.title}
                              >
                                <img src={g.preview || g.url} alt={g.title} className="w-full h-full object-cover block" loading="lazy" />
                              </button>
                            ))
                          )}
                        </div>
                        <p className="m-0 px-2.5 pb-2 text-[0.65rem] text-[#7a6a9a] text-right flex-shrink-0">Powered by GIPHY</p>
                      </div>
                    )}

                    <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ff8a5b] ${showEmoji ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[#ff8a5b]' : ''}`}
                          onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
                          title="Emojis"
                        >
                          <FaSmile />
                        </button>
                        <button
                          type="button"
                          className={`flex items-center justify-center w-10 h-10 bg-transparent border border-transparent rounded-[10px] text-[#7a6a9a] text-base cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#ff8a5b] ${showGif ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.06)] text-[#ff8a5b]' : ''}`}
                          onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
                          title="GIFs"
                        >
                          <FaImage />
                        </button>
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 h-11 px-3.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.04)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-200 min-w-0 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder={
                          channelData?.type === "read" && !isOwner
                            ? "Este canal é apenas para leitura"
                            : `Mensagem em ${channelData?.name}... (Enter para enviar)`
                        }
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending || (channelData?.type === "read" && !isOwner)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setShowEmoji(false);
                            setShowGif(false);
                          }
                        }}
                      />
                    </form>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Members Sidebar */}
          <aside className="w-[280px] min-w-[280px] h-full bg-[rgba(255,255,255,0.02)] border-l border-[rgba(255,255,255,0.04)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
              <h3 className="font-['Sora','Inter',system-ui,sans-serif] text-sm font-bold text-[#f0ebff] m-0 flex items-center gap-2">
                <FaUsers /> Membros
              </h3>
              <span className="text-xs font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded-full">{members.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(167,139,250,0.2)] [&::-webkit-scrollbar-thumb]:rounded-full">
              {members.map((m) => {
                const displayColor = m.roleColor || "#f0ebff";

                return (
                  <div key={m.uid} className="flex items-center gap-2.5 py-1.5 px-2 rounded-[10px] hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-150">
                    <div className="relative flex-shrink-0">
                      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xs font-bold uppercase overflow-hidden">
                        {m.photoURL ? (
                          <img
                            src={m.photoURL}
                            alt={m.displayName}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <FaUser className="text-xs" />
                        )}
                      </div>
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[rgba(255,255,255,0.04)]"
                        style={{
                          background: m.status === "online"
                            ? "#4fd8c4"
                            : m.status === "away"
                              ? "#fbbf24"
                              : "#7a6a9a",
                          boxShadow: m.status === "online"
                            ? "0 0 6px #4fd8c4"
                            : m.status === "away"
                              ? "0 0 6px #fbbf24"
                              : "none",
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium block" style={{ color: displayColor }}>
                        {m.displayName}
                        {m.isOwner && (
                          <span className="ml-1 text-[#fbbf24]"><FaCrown className="inline text-xs" /></span>
                        )}
                      </span>
                      <span className="text-xs text-[#7a6a9a] block">@{m.username || "usuário"}</span>
                      {isOwner && m.uid !== user?.uid && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {roles.filter(r => !r.default).map(role => (
                            <button
                              key={role.id}
                              type="button"
                              className={`text-[0.55rem] font-semibold px-1.5 py-0.5 rounded border transition-all duration-150 ${(m.roles || []).includes(role.id) ? 'bg-[rgba(255,255,255,0.06)]' : 'bg-transparent opacity-50 hover:opacity-100'}`}
                              onClick={() => handleAssignRole(m.uid, role.id)}
                              style={{
                                borderColor: (m.roles || []).includes(role.id) ? role.color : 'rgba(255,255,255,0.06)',
                                color: (m.roles || []).includes(role.id) ? role.color : '#7a6a9a',
                              }}
                              title={role.name}
                            >
                              {role.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[0.6rem] font-semibold flex-shrink-0"
                      style={{
                        color: m.status === "online"
                          ? "#4fd8c4"
                          : m.status === "away"
                            ? "#fbbf24"
                            : "#7a6a9a",
                      }}
                    >
                      {m.status === "online" ? "Online" : m.status === "away" ? "Ausente" : "Offline"}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showChannelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[12px] flex items-center justify-center z-[2000] p-5" onClick={() => setShowChannelModal(false)}>
          <div className="relative w-full max-w-[440px] p-8 px-7 bg-[linear-gradient(165deg,#1d0e2e,#2b1140)] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] text-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f0ebff]"
              onClick={() => setShowChannelModal(false)}
            >
              <FaTimes />
            </button>
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-[16px] bg-[rgba(255,138,91,0.15)] border border-[rgba(255,255,255,0.06)] text-[#ff8a5b] text-[1.4rem]">
              <FaPlus />
            </div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-5">Criar canal</h2>
            <div className="flex flex-col gap-4 text-left">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === 'text' ? 'bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]' : 'border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]'}`}
                    onClick={() => setChannelType('text')}
                  >
                    <FaCommentAlt /> Texto
                  </button>
                  <button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === 'read' ? 'bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]' : 'border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]'}`}
                    onClick={() => setChannelType('read')}
                  >
                    <FaBookOpen /> Leitura
                  </button>
                  <button
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === 'category' ? 'bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]' : 'border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]'}`}
                    onClick={() => setChannelType('category')}
                  >
                    <FaFolder /> Categoria
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="channelName" className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Nome do canal</label>
                <input
                  id="channelName"
                  type="text"
                  placeholder="Ex: geral"
                  className="h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                  value={channelName}
                  onChange={(e) => { setChannelName(e.target.value); setChannelError(""); }}
                  disabled={creatingChannel}
                  autoFocus
                />
              </div>
              {(channelType === "text" || channelType === "read") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Categoria</label>
                  <select
                    className="h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedCategoryId}
                    onChange={(e) => { setSelectedCategoryId(e.target.value); setChannelError(""); }}
                    disabled={creatingChannel}
                  >
                    <option value="">Selecione uma categoria</option>
                    {channels.filter(c => c.type === "category").map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {channelError && <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">{channelError}</p>}
              <button
                type="button"
                className="inline-flex items-center justify-center h-11 px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={handleCreateChannel}
                disabled={creatingChannel || !channelName.trim()}
              >
                {creatingChannel ? "Criando..." : "Criar canal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Settings Modal */}
      {showServerSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-[12px] flex items-center justify-center z-[2000] p-5" onClick={() => setShowServerSettings(false)}>
          <div className="relative w-full max-w-[480px] p-8 px-7 bg-[linear-gradient(165deg,#1d0e2e,#2b1140)] border border-[rgba(255,255,255,0.06)] rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-4 right-4 flex items-center justify-center w-9 h-9 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#7a6a9a] text-sm cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f0ebff]"
              onClick={() => setShowServerSettings(false)}
            >
              <FaTimes />
            </button>
            <div className="w-14 h-14 mx-auto mb-3 flex items-center justify-center rounded-[16px] bg-[rgba(255,138,91,0.15)] border border-[rgba(255,255,255,0.06)] text-[#ff8a5b] text-[1.4rem]">
              <FaCrown />
            </div>
            <h2 className="font-['Sora','Inter',system-ui,sans-serif] text-xl font-bold text-[#f0ebff] m-0 mb-5 text-center">Configurações do servidor</h2>

            {/* Tabs */}
            <div className="flex gap-1 mb-5 bg-[rgba(255,255,255,0.03)] rounded-xl p-1 border border-[rgba(255,255,255,0.04)]">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-inherit cursor-pointer transition-all duration-200 ${settingsTab === 'general' ? 'bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white shadow-[0_4px_12px_rgba(167,139,250,0.2)]' : 'text-[#7a6a9a] hover:text-[#f0ebff]'}`}
                onClick={() => setSettingsTab('general')}
              >
                <FaServer /> Geral
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-inherit cursor-pointer transition-all duration-200 ${settingsTab === 'roles' ? 'bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white shadow-[0_4px_12px_rgba(167,139,250,0.2)]' : 'text-[#7a6a9a] hover:text-[#f0ebff]'}`}
                onClick={() => setSettingsTab('roles')}
              >
                <FaShieldAlt /> Cargos
              </button>
            </div>

            {settingsTab === 'general' ? (
              <div className="flex flex-col gap-4 text-left">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Nome do servidor</label>
                  <input
                    type="text"
                    placeholder="Nome do servidor"
                    className="h-11 px-3.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-[#f0ebff] text-sm font-inherit outline-none transition-all duration-300 placeholder:text-[#7a6a9a] focus:border-[#a78bfa] focus:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    disabled={updatingServer}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-[#b8a8d9] tracking-wide">Ícone do servidor</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.06)]">
                      {serverIconPreview || (typeof serverIcon === 'string' ? serverIcon : null) ? (
                        <img src={serverIconPreview || (typeof serverIcon === 'string' ? serverIcon : '')} alt="Ícone" className="w-full h-full object-cover" />
                      ) : (
                        serverName?.charAt(0).toUpperCase() || "S"
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="serverIconInput"
                      onChange={handleServerIconChange}
                      disabled={updatingServer}
                    />
                    <label htmlFor="serverIconInput" className="flex items-center justify-center h-10 px-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-[10px] text-sm font-semibold text-[#f0ebff] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(167,139,250,0.3)]">
                      Upload
                    </label>
                    {(serverIconPreview || (typeof serverIcon === 'string' && serverIcon)) && (
                      <button
                        type="button"
                        className="h-10 px-4 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-sm font-semibold text-[#f87171] cursor-pointer transition-all duration-200 hover:bg-[rgba(239,68,68,0.2)]"
                        onClick={() => { setServerIconPreview(null); setServerIcon(null); }}
                        disabled={updatingServer}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                {channelError && <p className="m-0 px-3.5 py-2.5 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.15)] rounded-[10px] text-[#f87171] text-sm text-center">{channelError}</p>}
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-11 px-5 rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-300 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none text-white shadow-[0_4px_16px_rgba(167,139,250,0.25)] hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(167,139,250,0.35)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleUpdateServer}
                  disabled={updatingServer || !serverName.trim()}
                >
                  {updatingServer ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            ) : (
              // Roles Tab
              <div className="flex flex-col gap-4 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#b8a8d9] m-0">Gerencie os cargos do servidor</p>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-9 px-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-[8px] text-sm font-semibold text-[#f0ebff] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)]"
                    onClick={handleAddRole}
                  >
                    <FaPlus className="text-xs" /> Novo cargo
                  </button>
                </div>
                {roles.filter(r => !r.default).length === 0 ? (
                  <p className="text-sm text-[#7a6a9a] text-center py-4">Nenhum cargo criado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {/* Everyone role (always first) */}
                    {roles.filter(r => r.default).map((role) => (
                      <div key={role.id} className="flex items-center justify-between gap-3 p-3 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.15)] rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: role.color }} />
                          <span className="text-sm font-bold text-[#f0ebff]">{role.name}</span>
                          <span className="text-xs text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded-full">Padrão</span>
                        </div>
                      </div>
                    ))}
                    {roles.filter(r => !r.default).sort((a, b) => (a.order || 0) - (b.order || 0)).map((role) => (
                      <div key={role.id} className="flex items-center justify-between gap-3 p-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150">
                        {editingRoleId === role.id ? (
                          <div className="flex-1 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingRoleColor}
                                onChange={(e) => setEditingRoleColor(e.target.value)}
                                className="w-8 h-8 p-1 border border-[rgba(255,255,255,0.06)] rounded-lg bg-transparent cursor-pointer"
                              />
                              <input
                                type="text"
                                value={editingRoleName}
                                onChange={(e) => setEditingRoleName(e.target.value)}
                                className="flex-1 min-w-[100px] h-9 px-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg text-[#f0ebff] text-sm font-inherit outline-none focus:border-[#a78bfa]"
                                placeholder="Nome do cargo"
                              />
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                className="h-8 px-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-lg text-white text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-105"
                                onClick={handleSaveRole}
                                disabled={updatingRole || !editingRoleName.trim()}
                              >
                                {updatingRole ? "..." : "Salvar"}
                              </button>
                              <button
                                type="button"
                                className="h-8 px-3 bg-transparent border border-[rgba(255,255,255,0.06)] rounded-lg text-[#7a6a9a] text-xs font-semibold cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)]"
                                onClick={handleCancelEditRole}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: role.color }} />
                              <span className="text-sm font-semibold text-[#f0ebff] truncate">{role.name}</span>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                                onClick={() => handleMoveRoleUp(role.id)}
                                title="Mover para cima"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                                onClick={() => handleMoveRoleDown(role.id)}
                                title="Mover para baixo"
                              >
                                ▼
                              </button>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
                                onClick={() => handleStartEditRole(role)}
                                title="Editar"
                              >
                                <FaPencilAlt />
                              </button>
                              <button
                                type="button"
                                className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#f87171]"
                                onClick={() => handleDeleteRole(role.id)}
                                title="Deletar"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}