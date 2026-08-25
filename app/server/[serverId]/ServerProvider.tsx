// app/server/[serverId]/ServerProvider.tsx
"use client";

import React, {
  createContext, useContext, useState, useEffect, useCallback, useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  ref, get, onValue, set, remove, update,
} from "firebase/database";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface ServerData {
  id: string;
  name: string;
  icon: string | null;
  ownerID: string;
  members: Record<string, any>;
}

export interface Channel {
  id: string;
  name: string;
  type: "text" | "read" | "category";
  categoryId: string | null;
  order: number;
  createdAt: number;
  createdBy: string;
}

export interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  order: number;
  default: boolean;
  createdAt?: number;
}

export interface Member {
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

export interface CategorizedChannel extends Channel {
  children: Channel[];
  isUncategorized?: boolean;
}

interface ServerContextValue {
  serverId: string;
  router: ReturnType<typeof useRouter>;

  user: AppUser | null;
  username: string;
  displayName: string;
  photoURL: string | null;
  loading: boolean;

  serverData: ServerData | null;
  isMember: boolean;
  isOwner: boolean;

  channels: Channel[];
  categorizedChannels: CategorizedChannel[];
  roles: Role[];
  members: Member[];

  // Create channel modal
  showChannelModal: boolean;
  setShowChannelModal: (v: boolean) => void;
  channelName: string;
  setChannelName: (v: string) => void;
  channelType: "text" | "read" | "category";
  setChannelType: (v: "text" | "read" | "category") => void;
  selectedCategoryId: string;
  setSelectedCategoryId: (v: string) => void;
  creatingChannel: boolean;
  channelError: string;
  setChannelError: (v: string) => void;
  handleCreateChannel: () => Promise<void>;

  // Channel management
  handleDeleteChannel: (channelId: string) => Promise<void>;
  handleRenameChannel: (channelId: string) => Promise<void>;
  handleMoveChannelUp: (channelId: string, categoryId: string | null) => Promise<void>;
  handleMoveChannelDown: (channelId: string, categoryId: string | null) => Promise<void>;
  handleMoveCategoryUp: (categoryId: string) => Promise<void>;
  handleMoveCategoryDown: (categoryId: string) => Promise<void>;
  handleMoveChannelToCategory: (channelId: string, targetCategoryId: string) => Promise<void>;

  // Server settings
  showServerSettings: boolean;
  setShowServerSettings: (v: boolean) => void;
  settingsTab: string;
  setSettingsTab: (v: string) => void;
  serverName: string;
  setServerName: (v: string) => void;
  serverIcon: string | File | null;
  setServerIcon: (v: string | File | null) => void;
  serverIconPreview: string | null;
  setServerIconPreview: (v: string | null) => void;
  updatingServer: boolean;
  handleServerIconChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleUpdateServer: () => Promise<void>;

  // Roles
  editingRoleId: string | null;
  editingRoleName: string;
  setEditingRoleName: (v: string) => void;
  editingRoleColor: string;
  setEditingRoleColor: (v: string) => void;
  updatingRole: boolean;
  handleAddRole: () => Promise<void>;
  handleDeleteRole: (roleId: string) => Promise<void>;
  handleStartEditRole: (role: Role) => void;
  handleCancelEditRole: () => void;
  handleSaveRole: () => Promise<void>;
  handleMoveRoleUp: (roleId: string) => Promise<void>;
  handleMoveRoleDown: (roleId: string) => Promise<void>;
  handleAssignRole: (memberId: string, roleId: string) => Promise<void>;
}

const ServerContext = createContext<ServerContextValue | null>(null);

export function useServerContext() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error("useServerContext deve ser usado dentro de <ServerProvider>");
  return ctx;
}

export function ServerProvider({ serverId, children }: { serverId: string; children: React.ReactNode }) {
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
  const [roles, setRoles] = useState<Role[]>([]);

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

  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [editingRoleColor, setEditingRoleColor] = useState("#a78bfa");
  const [updatingRole, setUpdatingRole] = useState(false);

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

        const everyoneRole = roles.find((r) => r.default === true);
        if (everyoneRole && !userRoleIds.includes(everyoneRole.id)) {
          userRoleIds = [...userRoleIds, everyoneRole.id];
          await update(ref(db, `servers/${serverId}/members/${uid}`), {
            roles: userRoleIds,
          });
        }

        let roleColor = null;
        let roleName = null;

        if (userRoleIds.length > 0 && roles.length > 0) {
          const userRoles = roles.filter((r) => userRoleIds.includes(r.id));
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
          roleColor,
          roleName,
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

    const everyoneRole = roles.find((r) => r.default === true);
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
    });
    return () => unsub();
  }, [serverId]);

  const categorizedChannels = useMemo((): CategorizedChannel[] => {
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
  }, [channels]);

  // Channel handlers
  const handleCreateChannel = useCallback(async () => {
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
      if (channelType === "text" || channelType === "read") {
        router.push(`/server/${serverId}/channel/${channelId}`);
      }
    } catch (error) {
      console.error(error);
      setChannelError("Erro ao criar canal. Tente novamente.");
    } finally {
      setCreatingChannel(false);
    }
  }, [isOwner, channelName, channelType, selectedCategoryId, serverId, user, router]);

  const handleDeleteChannel = useCallback(async (channelId: string) => {
    if (!isOwner) return;
    if (!confirm("Tem certeza que deseja deletar este canal?")) return;
    try {
      await remove(ref(db, `servers/${serverId}/channels/${channelId}`));
      router.push(`/server/${serverId}`);
    } catch (error) {
      alert("Erro ao deletar canal.");
    }
  }, [isOwner, serverId, router]);

  const handleRenameChannel = useCallback(async (channelId: string) => {
    if (!isOwner) return;
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    const newName = prompt("Novo nome do canal:", channel.name);
    if (!newName?.trim()) return;
    try {
      await update(ref(db, `servers/${serverId}/channels/${channelId}`), { name: newName.trim() });
    } catch (error) {
      alert("Erro ao renomear canal.");
    }
  }, [isOwner, channels, serverId]);

  const handleMoveChannelUp = useCallback(async (channelId: string, categoryId: string | null) => {
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
    } catch (error) {
      console.error("Erro ao mover canal para cima:", error);
    }
  }, [isOwner, channels, serverId]);

  const handleMoveChannelDown = useCallback(async (channelId: string, categoryId: string | null) => {
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
    } catch (error) {
      console.error("Erro ao mover canal para baixo:", error);
    }
  }, [isOwner, channels, serverId]);

  const handleMoveCategoryUp = useCallback(async (categoryId: string) => {
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
    } catch (error) {
      console.error("Erro ao mover categoria para cima:", error);
    }
  }, [isOwner, channels, serverId]);

  const handleMoveCategoryDown = useCallback(async (categoryId: string) => {
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
    } catch (error) {
      console.error("Erro ao mover categoria para baixo:", error);
    }
  }, [isOwner, channels, serverId]);

  const handleMoveChannelToCategory = useCallback(async (channelId: string, targetCategoryId: string) => {
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
    } catch (error) {
      console.error("Erro ao mover canal:", error);
      alert("Erro ao mover canal.");
    }
  }, [isOwner, channels, serverId]);

  // Role handlers
  const handleAddRole = useCallback(async () => {
    if (!isOwner) return;
    const roleName = prompt("Digite o nome do novo cargo:");
    if (!roleName?.trim()) return;

    try {
      const roleId = "role_" + Date.now() + Math.random().toString(36).substring(2, 7);
      const maxOrder = roles.reduce((max, r) => Math.max(max, r.order || 0), 0);
      const newRole = {
        id: roleId,
        name: roleName.trim(),
        color: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
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
  }, [isOwner, roles, serverId]);

  const handleDeleteRole = useCallback(async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find((r) => r.id === roleId);
    if (role?.default) {
      alert('Não é possível deletar o cargo padrão (Everyone).');
      return;
    }
    if (!confirm(`Tem certeza que deseja deletar o cargo "${role?.name}"?`)) return;
    try {
      await remove(ref(db, `servers/${serverId}/roles/${roleId}`));
      setEditingRoleId((curr) => (curr === roleId ? null : curr));
    } catch (error) {
      console.error("Erro ao deletar cargo:", error);
      alert("Erro ao deletar cargo.");
    }
  }, [isOwner, roles, serverId]);

  const handleStartEditRole = useCallback((role: Role) => {
    setEditingRoleId(role.id);
    setEditingRoleName(role.name);
    setEditingRoleColor(role.color || "#a78bfa");
  }, []);

  const handleCancelEditRole = useCallback(() => {
    setEditingRoleId(null);
    setEditingRoleName("");
    setEditingRoleColor("#a78bfa");
  }, []);

  const handleSaveRole = useCallback(async () => {
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
  }, [isOwner, editingRoleId, editingRoleName, editingRoleColor, serverId]);

  const handleMoveRoleUp = useCallback(async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find((r) => r.id === roleId);
    if (role?.default) return;

    const sortedRoles = [...roles]
      .filter((r) => !r.default)
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
  }, [isOwner, roles, serverId]);

  const handleMoveRoleDown = useCallback(async (roleId: string) => {
    if (!isOwner) return;
    const role = roles.find((r) => r.id === roleId);
    if (role?.default) return;

    const sortedRoles = [...roles]
      .filter((r) => !r.default)
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
  }, [isOwner, roles, serverId]);

  const handleAssignRole = useCallback(async (memberId: string, roleId: string) => {
    if (!isOwner) return;

    const member = members.find((m) => m.uid === memberId);
    if (!member) return;

    const currentRoles = member.roles || [];
    let newRoles: string[];

    if (currentRoles.includes(roleId)) {
      newRoles = currentRoles.filter((id) => id !== roleId);
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
  }, [isOwner, members, serverId]);

  // Server update handlers
  const handleServerIconChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onload = (ev) => {
      setServerIconPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    setServerIcon(file);
  }, []);

  const handleUpdateServer = useCallback(async () => {
    if (!isOwner) return;
    if (!serverName.trim()) { alert("Digite um nome para o servidor"); return; }

    setUpdatingServer(true);
    try {
      const updates: Record<string, any> = { name: serverName.trim() };

      if (serverIcon && typeof serverIcon !== "string") {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
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
  }, [isOwner, serverName, serverIcon, serverId]);

  const value: ServerContextValue = {
    serverId,
    router,
    user,
    username,
    displayName,
    photoURL,
    loading,
    serverData,
    isMember,
    isOwner,
    channels,
    categorizedChannels,
    roles,
    members,

    showChannelModal,
    setShowChannelModal,
    channelName,
    setChannelName,
    channelType,
    setChannelType,
    selectedCategoryId,
    setSelectedCategoryId,
    creatingChannel,
    channelError,
    setChannelError,
    handleCreateChannel,

    handleDeleteChannel,
    handleRenameChannel,
    handleMoveChannelUp,
    handleMoveChannelDown,
    handleMoveCategoryUp,
    handleMoveCategoryDown,
    handleMoveChannelToCategory,

    showServerSettings,
    setShowServerSettings,
    settingsTab,
    setSettingsTab,
    serverName,
    setServerName,
    serverIcon,
    setServerIcon,
    serverIconPreview,
    setServerIconPreview,
    updatingServer,
    handleServerIconChange,
    handleUpdateServer,

    editingRoleId,
    editingRoleName,
    setEditingRoleName,
    editingRoleColor,
    setEditingRoleColor,
    updatingRole,
    handleAddRole,
    handleDeleteRole,
    handleStartEditRole,
    handleCancelEditRole,
    handleSaveRole,
    handleMoveRoleUp,
    handleMoveRoleDown,
    handleAssignRole,
  };

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}
