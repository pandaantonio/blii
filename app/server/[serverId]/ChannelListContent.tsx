// app/server/[serverId]/ChannelListContent.tsx
"use client";

import React, { useState } from "react";
import {
  FaPlus, FaCommentAlt, FaBookOpen, FaLock, FaFolder, FaEllipsisV,
  FaCrown, FaUsers, FaArrowLeft,
} from "react-icons/fa";
import { useServerContext } from "./ServerProvider";

export default function ChannelListContent() {
  const {
    serverId, router, serverData, isOwner, channels, categorizedChannels,
    setShowChannelModal, setShowServerSettings,
    handleDeleteChannel, handleRenameChannel,
    handleMoveChannelUp, handleMoveChannelDown,
    handleMoveCategoryUp, handleMoveCategoryDown,
    handleMoveChannelToCategory,
  } = useServerContext();

  const [openChannelMenu, setOpenChannelMenu] = useState<string | null>(null);
  const [moveMenuChannelId, setMoveMenuChannelId] = useState<string | null>(null);

  const toggleChannelMenu = (id: string) => {
    if (!isOwner) return;
    setOpenChannelMenu(openChannelMenu === id ? null : id);
  };

  const goToChannel = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    if (channel?.type === "text" || channel?.type === "read") {
      router.push(`/server/${serverId}/channel/${channelId}`);
    }
  };

  const totalChannels = channels.filter((c) => c.type === "text" || c.type === "read").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
      {/* Voltar para a lista de servidores */}
      <button
        type="button"
        className="flex items-center gap-2 mb-5 md:mb-6 h-9 px-3 -ml-3 bg-transparent border-none rounded-lg text-sm font-semibold text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
        onClick={() => router.push("/servers")}
      >
        <FaArrowLeft className="text-xs" />
        Voltar para servidores
      </button>

      {/* Header do servidor */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-6 md:mb-8">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white font-['Sora','Inter',system-ui,sans-serif] text-2xl md:text-3xl font-bold shadow-[0_8px_32px_rgba(167,139,250,0.25)] overflow-hidden flex-shrink-0">
          {typeof serverData?.icon === "string" && serverData.icon ? (
            <img src={serverData.icon} alt={serverData.name} className="w-full h-full object-cover" />
          ) : (
            serverData?.name?.charAt(0).toUpperCase() || "S"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-xl md:text-2xl font-bold text-[#f0ebff] m-0 truncate">
            {serverData?.name}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs md:text-sm text-[#7a6a9a]">
            <span className="flex items-center gap-1.5">
              <FaUsers className="text-[#a78bfa]" />
              {Object.keys(serverData?.members || {}).length} membros
            </span>
            <span className="flex items-center gap-1.5">
              <FaCommentAlt className="text-[#a78bfa]" />
              {totalChannels} canais
            </span>
            {isOwner && (
              <span className="flex items-center gap-1.5 text-[#fbbf24]">
                <FaCrown /> Você é o dono
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {isOwner && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-10 px-4 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm font-semibold text-[#f0ebff] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.08)]"
              onClick={() => setShowServerSettings(true)}
            >
              <FaCrown className="text-[#ff8a5b]" />
              <span className="hidden sm:inline">Configurações</span>
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              className="flex items-center justify-center gap-2 h-10 px-4 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)]"
              onClick={() => setShowChannelModal(true)}
            >
              <FaPlus />
              <span className="hidden sm:inline">Canal</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista de canais */}
      {totalChannels === 0 ? (
        <div className="text-center py-16 px-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-2xl">
          <div className="text-4xl mb-3 opacity-60">💬</div>
          <p className="text-sm text-[#b8a8d9] m-0">Nenhum canal ainda</p>
          <span className="text-xs text-[#7a6a9a]">{isOwner ? "Clique em Canal para criar o primeiro" : "Aguardando o dono criar canais"}</span>
          {isOwner && (
            <div className="mt-5">
              <button
                type="button"
                className="px-6 py-3 bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] border-none rounded-xl text-white text-sm font-bold font-inherit cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(167,139,250,0.35)] inline-flex items-center gap-2"
                onClick={() => setShowChannelModal(true)}
              >
                <FaPlus /> Criar primeiro canal
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {categorizedChannels.map((category) => (
            <div key={category.id} className="relative">
              <div className="flex items-center gap-1.5 px-1 py-1.5 text-xs font-bold uppercase text-[#7a6a9a] tracking-wide">
                <FaFolder className="text-[10px]" />
                <span className="flex-1">{category.name}</span>
                {isOwner && !category.isUncategorized && (
                  <button
                    type="button"
                    className="flex items-center justify-center w-7 h-7 bg-transparent border-none rounded-[6px] text-[#7a6a9a] text-[10px] cursor-pointer hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff]"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-1.5">
                {category.children.map((channel) => (
                  <div key={channel.id} className="relative">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl cursor-pointer transition-all duration-200 hover:bg-[rgba(167,139,250,0.08)] hover:border-[rgba(167,139,250,0.2)] text-left"
                      onClick={() => goToChannel(channel.id)}
                    >
                      {channel.type === "read" ? (
                        <FaBookOpen className="text-[#7a6a9a] flex-shrink-0" />
                      ) : (
                        <FaCommentAlt className="text-[#7a6a9a] flex-shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-medium text-[#f0ebff] truncate">{channel.name}</span>
                      {channel.type === "read" && (
                        <span className="flex items-center gap-1 text-[0.6rem] font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.04)] px-1.5 py-0.5 rounded flex-shrink-0">
                          <FaLock /> Leitura
                        </span>
                      )}
                      {isOwner && (
                        <span
                          role="button"
                          className="flex items-center justify-center w-7 h-7 bg-transparent rounded-[6px] text-[#7a6a9a] text-[10px] cursor-pointer hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f0ebff] flex-shrink-0"
                          onClick={(e) => { e.stopPropagation(); toggleChannelMenu(channel.id); }}
                        >
                          <FaEllipsisV />
                        </span>
                      )}
                    </button>
                    {openChannelMenu === channel.id && isOwner && (
                      <div className="absolute z-10 min-w-[190px] bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1 right-0 top-full mt-1">
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={() => handleRenameChannel(channel.id)}>
                          ✏️ Renomear
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={() => handleMoveChannelUp(channel.id, category.id)}>
                          ▲ Mover para cima
                        </button>
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={() => handleMoveChannelDown(channel.id, category.id)}>
                          ▼ Mover para baixo
                        </button>
                        <div className="relative">
                          <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]" onClick={() => setMoveMenuChannelId(moveMenuChannelId === channel.id ? null : channel.id)}>
                            ➤ Mover para categoria {moveMenuChannelId === channel.id ? "▲" : "▼"}
                          </button>
                          {moveMenuChannelId === channel.id && (
                            <div className="static sm:absolute sm:left-full sm:top-0 sm:ml-1 min-w-[160px] bg-[rgba(20,10,40,0.98)] backdrop-blur-xl border border-[rgba(255,255,255,0.06)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-1">
                              {channels.filter((c) => c.type === "category" && c.id !== channel.categoryId).map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f0ebff] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(255,255,255,0.04)]"
                                  onClick={() => handleMoveChannelToCategory(channel.id, cat.id)}
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
                        <button type="button" className="flex items-center gap-2 w-full px-3 py-2 bg-transparent border-none rounded-[8px] text-[#f87171] text-sm cursor-pointer transition-all duration-150 hover:bg-[rgba(247,84,110,0.08)]" onClick={() => handleDeleteChannel(channel.id)}>
                          🗑️ Deletar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}