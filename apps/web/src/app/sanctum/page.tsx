"use client";

import { useState } from "react";
import { LobbyHub } from "@/components/sanctum/LobbyHub";
import { FocusRoom } from "@/components/sanctum/FocusRoom";

export default function Sanctum() {
    const [activeLobby, setActiveLobby] = useState<any>(null);

    return (
        <div className="relative overflow-hidden selection:bg-accent/30 w-full">
            {activeLobby ? (
                <FocusRoom 
                    initialLobby={activeLobby} 
                    onLeave={() => setActiveLobby(null)} 
                />
            ) : (
                <LobbyHub 
                    onJoin={(lobby) => setActiveLobby(lobby)} 
                    userId={""} // FocusRoom uses usePlayerStore, LobbyHub can use auth session
                />
            )}
        </div>
    );
}
