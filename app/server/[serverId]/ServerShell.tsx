// app/server/[serverId]/ServerShell.tsx
"use client";

import React from "react";
import {
  FaLock, FaTimes, FaPlus, FaCommentAlt, FaBookOpen, FaFolder,
  FaCrown, FaServer, FaShieldAlt, FaPencilAlt, FaTrash,
} from "react-icons/fa";
import { ServerProvider, useServerContext, Role } from "./ServerProvider";

function LoadingScreen({ text }: { text: string }) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col items-center justify-center gap-4 text-[#b8a8d9] text-sm w-full px-4 bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
      <div className="w-10 h-10 border-3 border-white/6 border-t-[#a78bfa] rounded-full animate-spin" />
      <p>{text}</p>
    </div>
  );
}

function AccessDenied() {
  const { router } = useServerContext();
  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center w-full px-4 bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
      <div className="bg-white/2 backdrop-blur-xl border border-white/6 rounded-2xl p-8 md:p-12 text-center max-w-md">
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
  );
}

function CreateChannelModal() {
  const {
    showChannelModal, setShowChannelModal,
    channelType, setChannelType,
    channelName, setChannelName,
    selectedCategoryId, setSelectedCategoryId,
    channelError, setChannelError,
    creatingChannel, handleCreateChannel,
    channels,
  } = useServerContext();

  if (!showChannelModal) return null;

  return (
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
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === "text" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]" : "border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]"}`}
                onClick={() => setChannelType("text")}
              >
                <FaCommentAlt /> Texto
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === "read" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]" : "border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]"}`}
                onClick={() => setChannelType("read")}
              >
                <FaBookOpen /> Leitura
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 h-10 px-3 bg-transparent border rounded-[10px] text-sm font-semibold font-inherit cursor-pointer transition-all duration-200 ${channelType === "category" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-transparent text-white shadow-[0_4px_16px_rgba(167,139,250,0.2)]" : "border-[rgba(255,255,255,0.06)] text-[#7a6a9a] hover:border-[rgba(255,255,255,0.15)]"}`}
                onClick={() => setChannelType("category")}
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
                {channels.filter((c) => c.type === "category").map((cat) => (
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
  );
}

function ServerSettingsModal() {
  const {
    showServerSettings, setShowServerSettings,
    settingsTab, setSettingsTab,
    serverName, setServerName,
    serverIcon, serverIconPreview, setServerIcon, setServerIconPreview,
    updatingServer, handleServerIconChange, handleUpdateServer,
    channelError,
    roles, editingRoleId, editingRoleName, setEditingRoleName,
    editingRoleColor, setEditingRoleColor, updatingRole,
    handleAddRole, handleSaveRole, handleCancelEditRole, handleStartEditRole,
    handleDeleteRole, handleMoveRoleUp, handleMoveRoleDown,
  } = useServerContext();

  if (!showServerSettings) return null;

  return (
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

        <div className="flex gap-1 mb-5 bg-[rgba(255,255,255,0.03)] rounded-xl p-1 border border-[rgba(255,255,255,0.04)]">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-inherit cursor-pointer transition-all duration-200 ${settingsTab === "general" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white shadow-[0_4px_12px_rgba(167,139,250,0.2)]" : "text-[#7a6a9a] hover:text-[#f0ebff]"}`}
            onClick={() => setSettingsTab("general")}
          >
            <FaServer /> Geral
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-inherit cursor-pointer transition-all duration-200 ${settingsTab === "roles" ? "bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] text-white shadow-[0_4px_12px_rgba(167,139,250,0.2)]" : "text-[#7a6a9a] hover:text-[#f0ebff]"}`}
            onClick={() => setSettingsTab("roles")}
          >
            <FaShieldAlt /> Cargos
          </button>
        </div>

        {settingsTab === "general" ? (
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
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-xl font-bold overflow-hidden flex-shrink-0 border border-[rgba(255,255,255,0.06)]">
                  {serverIconPreview || (typeof serverIcon === "string" ? serverIcon : null) ? (
                    <img src={serverIconPreview || (typeof serverIcon === "string" ? serverIcon : "")} alt="Ícone" className="w-full h-full object-cover" />
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
                {(serverIconPreview || (typeof serverIcon === "string" && serverIcon)) && (
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
            {roles.filter((r) => !r.default).length === 0 ? (
              <p className="text-sm text-[#7a6a9a] text-center py-4">Nenhum cargo criado ainda.</p>
            ) : (
              <div className="space-y-2">
                {roles.filter((r) => r.default).map((role) => (
                  <div key={role.id} className="flex items-center justify-between gap-3 p-3 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.15)] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: role.color }} />
                      <span className="text-sm font-bold text-[#f0ebff]">{role.name}</span>
                      <span className="text-xs text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 rounded-full">Padrão</span>
                    </div>
                  </div>
                ))}
                {roles.filter((r) => !r.default).sort((a, b) => (a.order || 0) - (b.order || 0)).map((role: Role) => (
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
                          <button type="button" className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]" onClick={() => handleMoveRoleUp(role.id)} title="Mover para cima">▲</button>
                          <button type="button" className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]" onClick={() => handleMoveRoleDown(role.id)} title="Mover para baixo">▼</button>
                          <button type="button" className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]" onClick={() => handleStartEditRole(role)} title="Editar"><FaPencilAlt /></button>
                          <button type="button" className="w-7 h-7 flex items-center justify-center bg-transparent border-none rounded-lg text-[#7a6a9a] text-xs cursor-pointer transition-all duration-150 hover:bg-[rgba(239,68,68,0.1)] hover:text-[#f87171]" onClick={() => handleDeleteRole(role.id)} title="Deletar"><FaTrash /></button>
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
  );
}

function ServerShellInner({ children }: { children: React.ReactNode }) {
  const { loading, serverData, user, isMember } = useServerContext();

  if (loading || !serverData || !user) {
    return <LoadingScreen text="Carregando..." />;
  }

  if (!isMember) {
    return <AccessDenied />;
  }

  return (
    <>
      <div className="min-h-screen min-h-dvh w-full text-[#f0ebff] font-['Inter',system-ui,-apple-system,'Segoe_UI',Roboto,sans-serif] bg-[radial-gradient(ellipse_at_20%_20%,#1a0a2e_0%,#0a0618_50%,#2d1045_100%)]">
        {children}
      </div>
      <CreateChannelModal />
      <ServerSettingsModal />
    </>
  );
}

export default function ServerShell({ serverId, children }: { serverId: string; children: React.ReactNode }) {
  return (
    <ServerProvider serverId={serverId}>
      <ServerShellInner>{children}</ServerShellInner>
    </ServerProvider>
  );
}
