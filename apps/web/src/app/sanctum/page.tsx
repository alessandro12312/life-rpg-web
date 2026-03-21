"use client";

import { useState } from "react";
import { LobbyHub } from "@/components/sanctum/LobbyHub";
import { FocusRoom } from "@/components/sanctum/FocusRoom";

export default function Sanctum() {
    const [activeLobby, setActiveLobby] = useState<any>(null);

    return (
        <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center relative overflow-hidden selection:bg-accent/30">
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
        </main>
    );
}
