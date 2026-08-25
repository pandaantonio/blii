// app/server/[serverId]/channel/[channelId]/members/MembersContent.tsx
"use client";

import React from "react";
import { FaArrowLeft, FaUsers, FaUser, FaCrown } from "react-icons/fa";
import { useServerContext } from "../../../ServerProvider";

export default function MembersContent({ channelId }: { channelId: string }) {
  const { serverId, router, members, roles, isOwner, user, handleAssignRole } = useServerContext();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-[8px] text-[#7a6a9a] cursor-pointer transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f0ebff] flex-shrink-0"
          onClick={() => router.push(`/server/${serverId}/channel/${channelId}`)}
          title="Voltar para o canal"
        >
          <FaArrowLeft />
        </button>
        <h1 className="font-['Sora','Inter',system-ui,sans-serif] text-xl md:text-2xl font-bold text-[#f0ebff] m-0 flex items-center gap-2">
          <FaUsers /> Membros
        </h1>
        <span className="text-xs font-semibold text-[#7a6a9a] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 rounded-full">{members.length}</span>
      </div>

      {/* Grid de membros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => {
          const displayColor = m.roleColor || "#f0ebff";
          return (
            <div key={m.uid} className="flex items-start gap-3 p-3.5 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] rounded-xl hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-150">
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#ff8a5b] to-[#a78bfa] flex items-center justify-center text-white text-sm font-bold uppercase overflow-hidden">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <FaUser className="text-sm" />
                  )}
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0618]"
                  style={{
                    background: m.status === "online" ? "#4fd8c4" : m.status === "away" ? "#fbbf24" : "#7a6a9a",
                    boxShadow: m.status === "online" ? "0 0 6px #4fd8c4" : m.status === "away" ? "0 0 6px #fbbf24" : "none",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: displayColor }}>
                    {m.displayName}
                    {m.isOwner && <span className="ml-1 text-[#fbbf24]"><FaCrown className="inline text-xs" /></span>}
                  </span>
                  <span
                    className="text-[0.6rem] font-semibold flex-shrink-0"
                    style={{ color: m.status === "online" ? "#4fd8c4" : m.status === "away" ? "#fbbf24" : "#7a6a9a" }}
                  >
                    {m.status === "online" ? "Online" : m.status === "away" ? "Ausente" : "Offline"}
                  </span>
                </div>
                <span className="text-xs text-[#7a6a9a] block truncate">@{m.username || "usuário"}</span>
                {isOwner && m.uid !== user?.uid && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {roles.filter((r) => !r.default).map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        className={`text-[0.6rem] font-semibold px-1.5 py-0.5 rounded border transition-all duration-150 ${(m.roles || []).includes(role.id) ? "bg-[rgba(255,255,255,0.06)]" : "bg-transparent opacity-50 hover:opacity-100"}`}
                        onClick={() => handleAssignRole(m.uid, role.id)}
                        style={{
                          borderColor: (m.roles || []).includes(role.id) ? role.color : "rgba(255,255,255,0.06)",
                          color: (m.roles || []).includes(role.id) ? role.color : "#7a6a9a",
                        }}
                        title={role.name}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {members.length === 0 && (
        <div className="text-center py-16 text-sm text-[#7a6a9a]">Nenhum membro encontrado.</div>
      )}
    </div>
  );
}
