"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Key } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                router.push("/");
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: email.split('@')[0],
                        }
                    }
                });
                if (error) throw error;
                // Se non richiedi conferma mail, puoi reindirizzare.
                // Se la richiedi, mostra un toast message:
                alert("Account creato! Verifica l'email per confermare oppure loggati direttamente se l'email verification è disattivata.");
                setIsLogin(true);
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
            {/* Immersive background aura */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent flex items-center justify-center pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm z-10"
            >
                <div className="bg-surface/80 backdrop-blur-xl border border-surface-border p-8 rounded-3xl shadow-2xl relative overflow-hidden">

                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4 border border-primary/30">
                            <Key className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Life RPG</h1>
                        <p className="text-sm text-foreground/60">{isLogin ? 'Enter the matrix.' : 'Create your avatar.'}</p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                                placeholder="player@world.real"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background border border-surface-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {errorMsg && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-medium text-center">
                                {errorMsg}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 mt-4 rounded-xl font-bold bg-primary text-[#09090b] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-transform flex justify-center items-center"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                isLogin ? 'Login to Nexus' : 'Awaken Avatar'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-foreground/50 hover:text-primary transition-colors hover:underline underline-offset-4"
                        >
                            {isLogin ? "New here? Create character." : "Already an RPG hero? Login."}
                        </button>
                    </div>

                </div>
            </motion.div>
        </main>
    );
}
