"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { API_URL } from "@/lib/api";
import { Check, X, AlertTriangle, Loader2 } from "lucide-react";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

type FieldValidity = "default" | "valid" | "error";

/**
 * Floating eldritch runes drifting slowly in the background.
 * Simple SVG glyph shapes, low opacity, randomized stagger/duration.
 */
function FloatingRunes({ reduced }: { reduced: boolean }) {
    const runes = useMemo(
        () =>
            Array.from({ length: 7 }, (_, i) => ({
                id: i,
                left: `${(i * 13 + Math.random() * 10) % 100}%`,
                top: `${(i * 17 + Math.random() * 15) % 100}%`,
                size: 24 + Math.random() * 18,
                duration: 12 + Math.random() * 6,
                delay: Math.random() * 5,
                opacity: 0.08 + Math.random() * 0.07,
                rotate: Math.random() * 360,
            })),
        []
    );

    if (reduced) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {runes.map((rune) => (
                <motion.svg
                    key={rune.id}
                    width={rune.size}
                    height={rune.size}
                    viewBox="0 0 24 24"
                    style={{
                        position: "absolute",
                        left: rune.left,
                        top: rune.top,
                        opacity: rune.opacity,
                        rotate: `${rune.rotate}deg`,
                    }}
                    animate={{ y: [0, -20, 0] }}
                    transition={{
                        duration: rune.duration,
                        delay: rune.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    <circle cx="12" cy="12" r="9" stroke="#8b5cf6" strokeWidth="1" fill="none" />
                    <path
                        d="M12 3 L12 21 M5 8 L19 8 M7 16 L17 16 M9 4 L9 20"
                        stroke="#8b5cf6"
                        strokeWidth="1"
                        fill="none"
                    />
                </motion.svg>
            ))}
        </div>
    );
}

/**
 * Drifting ember particles rising behind the card, fading out continuously.
 * Generated via JS map with randomized positions/durations (Framer Motion keyframes).
 */
function EmberParticles({ reduced }: { reduced: boolean }) {
    const embers = useMemo(
        () =>
            Array.from({ length: 18 }, (_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                size: 2 + Math.random() * 3,
                duration: 4 + Math.random() * 5,
                delay: Math.random() * 6,
                rise: 80 + Math.random() * 120,
            })),
        []
    );

    if (reduced) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {embers.map((ember) => (
                <motion.div
                    key={ember.id}
                    style={{
                        position: "absolute",
                        left: ember.left,
                        bottom: "-10px",
                        width: ember.size,
                        height: ember.size,
                        borderRadius: "50%",
                        background: "#f59e0b",
                        filter: "blur(1px)",
                    }}
                    animate={{
                        y: [0, -ember.rise],
                        opacity: [0, 0.8, 0],
                    }}
                    transition={{
                        duration: ember.duration,
                        delay: ember.delay,
                        repeat: Infinity,
                        ease: "easeOut",
                    }}
                />
            ))}
        </div>
    );
}

/**
 * Circular runic seal replacing the old Key icon. Different glyph for login vs register.
 */
function RunicSeal({ isLogin, pulsing }: { isLogin: boolean; pulsing: boolean }) {
    return (
        <motion.div
            animate={pulsing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={pulsing ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
            className="svg-glow-gold"
        >
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#f59e0b" strokeWidth="1.5" />
                <circle cx="32" cy="32" r="24" stroke="#f59e0b" strokeWidth="1" opacity="0.6" />
                {isLogin ? (
                    // Login glyph: an open eye / key-ward sigil
                    <path
                        d="M32 22 L38 32 L32 42 L26 32 Z M32 27 L32 37 M22 32 L42 32"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinejoin="round"
                    />
                ) : (
                    // Registration glyph: a star-burst / creation sigil
                    <path
                        d="M32 18 L32 46 M20 32 L44 32 M23 23 L41 41 M41 23 L23 41"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                    />
                )}
            </svg>
        </motion.div>
    );
}

interface FieldStatusIconProps {
    validity: FieldValidity;
}

function FieldStatusIcon({ validity }: FieldStatusIconProps) {
    if (validity === "valid") {
        return <Check className="w-4 h-4 text-primary" />;
    }
    if (validity === "error") {
        return <AlertTriangle className="w-4 h-4 text-combat-red" />;
    }
    return null;
}

function inputBorderClasses(validity: FieldValidity) {
    switch (validity) {
        case "valid":
            return "border-primary";
        case "error":
            return "border-combat-red focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]";
        default:
            return "border-surface-border focus:border-accent focus:shadow-[0_0_0_3px_rgba(0,240,255,0.15)]";
    }
}

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [success, setSuccess] = useState(false);
    const [shakeCard, setShakeCard] = useState(false);

    const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
    const [usernameShake, setUsernameShake] = useState(false);

    const router = useRouter();
    const prefersReducedMotion = useReducedMotion();

    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
    const [isFlipping, setIsFlipping] = useState(false);

    const usernameSeqRef = useRef(0);
    const usernameAbortRef = useRef<AbortController | null>(null);

    // Mouse-follow 3D tilt on the card. Freezes flat over interactive
    // elements so the tilt never shifts the target out from under the cursor
    // while aiming for an input/button.
    const handleCardMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (prefersReducedMotion) return;
            const target = e.target as HTMLElement;
            if (target.closest("input, button, label, textarea, a")) {
                setTilt({ rotateX: 0, rotateY: 0 });
                return;
            }
            const card = cardRef.current;
            if (!card) return;
            const rect = card.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = (e.clientX - cx) / (rect.width / 2);
            const dy = (e.clientY - cy) / (rect.height / 2);
            const maxTilt = 4;
            setTilt({ rotateX: -dy * maxTilt, rotateY: dx * maxTilt });
        },
        [prefersReducedMotion]
    );

    const handleCardMouseLeave = useCallback(() => {
        setTilt({ rotateX: 0, rotateY: 0 });
    }, []);

    // Debounced live username availability check (register mode only)
    useEffect(() => {
        if (isLogin) return;

        if (!username) {
            setUsernameStatus("idle");
            return;
        }

        if (!USERNAME_REGEX.test(username)) {
            setUsernameStatus("idle");
            return;
        }

        const mySeq = ++usernameSeqRef.current;
        setUsernameStatus("checking");

        const timer = setTimeout(async () => {
            usernameAbortRef.current?.abort();
            const controller = new AbortController();
            usernameAbortRef.current = controller;

            try {
                const res = await fetch(
                    `${API_URL}/player/username-availability?username=${encodeURIComponent(username)}`,
                    { signal: controller.signal }
                );

                // Ignore stale responses if the user kept typing
                if (mySeq !== usernameSeqRef.current) return;

                if (res.status === 200) {
                    const data = await res.json();
                    if (data.available) {
                        setUsernameStatus("available");
                    } else {
                        setUsernameStatus("taken");
                        setUsernameShake(true);
                        setTimeout(() => setUsernameShake(false), 200);
                    }
                } else {
                    // 400 or other: silent neutral state, don't block the form
                    setUsernameStatus("error");
                }
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                if (mySeq !== usernameSeqRef.current) return;
                setUsernameStatus("error");
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [username, isLogin]);

    const emailValidity: FieldValidity = email.length === 0 ? "default" : /\S+@\S+\.\S+/.test(email) ? "valid" : "error";
    const passwordValidity: FieldValidity = password.length === 0 ? "default" : password.length >= 6 ? "valid" : "default";
    const confirmValidity: FieldValidity =
        confirmPassword.length === 0 ? "default" : confirmPassword === password ? "valid" : "error";

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

                setSuccess(true);
                setTimeout(() => {
                    router.push("/");
                }, 600);
            } else {
                if (password !== confirmPassword) {
                    throw new Error("Le password non coincidono.");
                }
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username || email.split("@")[0],
                        },
                    },
                });
                if (error) throw error;

                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    alert("Avatar creato con successo! Ora procedi con il login.");
                    setIsLogin(true);
                }, 600);
            }
        } catch (error: any) {
            setErrorMsg(error.message);
            if (!prefersReducedMotion) {
                setShakeCard(true);
                setTimeout(() => setShakeCard(false), 350);
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setErrorMsg("");
        setIsFlipping(true);
        setTimeout(() => setIsFlipping(false), 450);
    };

    return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
            {/* Atmospheric outer wrapper: faint runic scanlines */}
            <div className="runic-scanlines runic-scanlines-faint absolute inset-0 pointer-events-none" />

            {/* Nebula: radial gradient mist with slow pulsation */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at 30% 30%, rgba(139,92,246,0.05), transparent 60%), radial-gradient(circle at 70% 70%, rgba(0,240,255,0.05), transparent 60%)",
                    filter: "blur(40px)",
                }}
                animate={prefersReducedMotion ? {} : { scale: [1, 1.08, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Floating runes */}
            <FloatingRunes reduced={!!prefersReducedMotion} />

            {/* Ember particles behind the card */}
            <EmberParticles reduced={!!prefersReducedMotion} />

            {/* Vignette */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: "radial-gradient(circle, transparent 40%, rgba(0,0,0,0.85) 100%)",
                }}
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={isLogin ? "login" : "register"}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-sm z-10 perspective-card-deck"
                >
                    <motion.div
                        ref={cardRef}
                        onMouseMove={handleCardMouseMove}
                        onMouseLeave={handleCardMouseLeave}
                        className={`tilt-card bg-surface/80 backdrop-blur-xl border p-8 rounded-3xl shadow-2xl relative overflow-hidden ${
                            shakeCard
                                ? prefersReducedMotion
                                    ? "border-surface-border outline outline-2 outline-combat-red"
                                    : "border-combat-red"
                                : "border-surface-border"
                        } ${success ? "card-success-pulse" : ""}`}
                        animate={
                            prefersReducedMotion
                                ? {}
                                : shakeCard
                                ? { x: [0, -6, 6, -4, 4, 0], rotateY: 0, rotateX: 0 }
                                : isFlipping
                                ? { rotateY: [0, 8, 0], rotateX: 0 }
                                : {
                                      rotateY: tilt.rotateY,
                                      rotateX: tilt.rotateX,
                                  }
                        }
                        transition={
                            shakeCard
                                ? { duration: 0.35, ease: "easeInOut" }
                                : isFlipping
                                ? { duration: 0.45, ease: [0.2, 1, 0.3, 1] }
                                : { type: "tween", duration: 0.3, ease: "easeOut" }
                        }
                        style={{ transformStyle: "preserve-3d" }}
                    >
                        <div className="flex flex-col items-center mb-8">
                            <div className="mb-4">
                                <RunicSeal isLogin={isLogin} pulsing={loading} />
                            </div>
                            <h1 className="font-press-start retro-text-glow-gold text-base sm:text-lg tracking-tight text-center">
                                Life RPG
                            </h1>
                            <p className="font-vt323 text-base text-foreground/60 mt-2">
                                {isLogin ? "Varca la soglia del Regno." : "Forgia il tuo avatar."}
                            </p>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                                    Email
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full bg-background border rounded-xl px-4 py-3 pr-10 outline-none transition-colors text-sm ${inputBorderClasses(
                                            emailValidity
                                        )}`}
                                        placeholder="player@world.real"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <FieldStatusIcon validity={emailValidity} />
                                    </div>
                                </div>
                            </div>

                            {isLogin && (
                                <div>
                                    <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 block">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full bg-background border rounded-xl px-4 py-3 pr-10 outline-none transition-colors text-sm ${inputBorderClasses(
                                                passwordValidity
                                            )}`}
                                            placeholder="••••••••"
                                        />
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                            <FieldStatusIcon validity={passwordValidity} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <AnimatePresence>
                                {!isLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden space-y-4"
                                    >
                                        <div>
                                            <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 mt-2 block">
                                                Username
                                            </label>
                                            <motion.div
                                                className="relative"
                                                animate={
                                                    usernameShake && !prefersReducedMotion
                                                        ? { x: [0, -4, 4, 0] }
                                                        : { x: 0 }
                                                }
                                                transition={{ duration: 0.2 }}
                                            >
                                                <input
                                                    type="text"
                                                    required={!isLogin}
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    className={`w-full bg-background border rounded-xl px-4 py-3 pr-10 outline-none transition-colors text-sm ${inputBorderClasses(
                                                        usernameStatus === "taken"
                                                            ? "error"
                                                            : usernameStatus === "available"
                                                            ? "valid"
                                                            : "default"
                                                    )}`}
                                                    placeholder="HeroName"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <AnimatePresence mode="wait">
                                                        {usernameStatus === "checking" && (
                                                            <motion.div
                                                                key="checking"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.15 }}
                                                            >
                                                                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                                                            </motion.div>
                                                        )}
                                                        {usernameStatus === "available" && (
                                                            <motion.div
                                                                key="available"
                                                                initial={{ opacity: 0, scale: 0.6 }}
                                                                animate={{ opacity: 1, scale: [0.6, 1.1, 1] }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.3 }}
                                                            >
                                                                <Check className="w-4 h-4 text-accent" />
                                                            </motion.div>
                                                        )}
                                                        {usernameStatus === "taken" && (
                                                            <motion.div
                                                                key="taken"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                transition={{ duration: 0.15 }}
                                                            >
                                                                <X className="w-4 h-4 text-combat-red" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>

                                            <AnimatePresence mode="wait">
                                                {usernameStatus === "checking" && (
                                                    <motion.p
                                                        key="checking-text"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="font-vt323 text-sm text-accent mt-1"
                                                    >
                                                        Scrutando il Regno...
                                                    </motion.p>
                                                )}
                                                {usernameStatus === "available" && (
                                                    <motion.p
                                                        key="available-text"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="font-vt323 text-sm text-primary mt-1"
                                                    >
                                                        Nome libero, Campione
                                                    </motion.p>
                                                )}
                                                {usernameStatus === "taken" && (
                                                    <motion.p
                                                        key="taken-text"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="font-vt323 text-sm text-combat-red mt-1"
                                                    >
                                                        Già reclamato da un altro eroe
                                                    </motion.p>
                                                )}
                                                {usernameStatus === "idle" && username.length > 0 && (
                                                    <motion.p
                                                        key="idle-text"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="font-vt323 text-sm text-foreground/40 mt-1"
                                                    >
                                                        3-20 caratteri, lettere/numeri/_
                                                    </motion.p>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 mt-2 block">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        required={!isLogin}
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        className={`w-full bg-background border rounded-xl px-4 py-3 pr-8 outline-none transition-colors text-sm ${inputBorderClasses(
                                                            passwordValidity
                                                        )}`}
                                                        placeholder="••••••••"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <FieldStatusIcon validity={passwordValidity} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-2 mt-2 block">
                                                    Confirm
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="password"
                                                        required={!isLogin}
                                                        value={confirmPassword}
                                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                                        className={`w-full bg-background border rounded-xl px-4 py-3 pr-8 outline-none transition-colors text-sm ${inputBorderClasses(
                                                            confirmValidity
                                                        )}`}
                                                        placeholder="••••••••"
                                                    />
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <FieldStatusIcon validity={confirmValidity} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {errorMsg && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-xs font-medium text-center">
                                    {errorMsg}
                                </div>
                            )}

                            <motion.button
                                type="submit"
                                disabled={loading}
                                animate={loading ? { borderRadius: "9999px" } : { borderRadius: "0.75rem" }}
                                className="w-full py-3 mt-4 font-bold bg-primary text-[#09090b] shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-transform flex justify-center items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin"></div>
                                ) : isLogin ? (
                                    "Login to Nexus"
                                ) : (
                                    "Awaken Avatar"
                                )}
                            </motion.button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="text-xs text-foreground/50 hover:text-primary transition-colors hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                            >
                                {isLogin ? "New here? Create character." : "Already an RPG hero? Login."}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </main>
    );
}
