"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Sparkles, ArrowLeft, BookOpen, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/glass-card";

export default function TheLibrary() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Mock functions for UI interactions
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setUploadedFile(e.dataTransfer.files[0].name);
        }
    };

    const handleGenerateQuiz = () => {
        setIsGenerating(true);
        // Simulate AI generation time
        setTimeout(() => {
            setIsGenerating(false);
            alert("AI Quiz Generated! (Mock)");
        }, 2500);
    };

    const btnClass = !uploadedFile
        ? 'flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all bg-surface text-foreground/30 cursor-not-allowed'
        : isGenerating
            ? 'flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all bg-accent/20 text-accent border border-accent/50 cursor-wait'
            : 'flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all bg-primary text-black shadow-lg hover:shadow-xl hover:scale-105';

    const dropZoneClass = isDragging
        ? 'relative overflow-hidden border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[320px] border-cyan-400 bg-cyan-950/10 scale-[1.01]'
        : 'relative overflow-hidden border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[320px] border-zinc-800 bg-[#0c0c14]/90 hover:border-cyan-500/30 hover:bg-[#0f0f1a]/95';

    return (
        <div className="space-y-8">

            {/* Header / Navigation */}
            <header className="flex items-center gap-4 pb-2">
                <Link href="/">
                    <button className="p-3 bg-surface/80 backdrop-blur border border-surface-border hover:bg-surface rounded-full transition-colors text-foreground">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-primary drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-blue-400 opacity-80" /> The Library
                    </h1>
                    <p className="text-foreground/70 text-sm mt-1">Upload your knowledge. Face the Oracle's trials.</p>
                </div>
            </header>

                <div className="grid md:grid-cols-5 gap-6">

                    {/* Main Content: The Altar (Upload Area) */}
                    <section className="md:col-span-3 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" />
                            The Oracle's Altar
                        </h2>

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={dropZoneClass}
                        >
                            {/* Cyan scanning laser beam */}
                            <motion.div
                                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee,0_0_4px_#22d3ee] z-20 pointer-events-none"
                                initial={{ top: "0%" }}
                                animate={{ top: "100%" }}
                                transition={{
                                    duration: 3.5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    repeatType: "reverse"
                                }}
                            />

                            {/* Background Radial Glow */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.04)_0%,transparent_70%)] pointer-events-none" />

                            {!uploadedFile ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="z-10"
                                >
                                    <div className="w-20 h-20 mx-auto bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/50 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <UploadCloud className={`w-10 h-10 transition-colors ${isDragging ? 'text-cyan-400' : 'text-foreground/40'}`} />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Offer your scrolls to the Oracle</h3>
                                    <p className="text-xs text-foreground/50 max-w-xs mx-auto leading-relaxed">
                                        Drag and drop PDF, Markdown, or Text files here. Maximum 10MB per offering.
                                    </p>
                                    <div className="mt-8 flex items-center justify-center gap-4">
                                        <span className="h-px w-12 bg-zinc-800"></span>
                                        <span className="text-xs text-foreground/30 uppercase tracking-widest font-mono">or</span>
                                        <span className="h-px w-12 bg-zinc-800"></span>
                                    </div>
                                    <button className="mt-6 px-6 py-2 rounded-full border border-zinc-800 bg-zinc-900 hover:bg-cyan-400 hover:text-black hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all text-xs font-semibold">
                                        Browse Scrolls
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="z-10 w-full"
                                >
                                    <div className="bg-[#12121e] border border-cyan-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <FileText className="w-12 h-12 text-cyan-400 mx-auto mb-4 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse" />
                                        <h3 className="font-mono text-sm truncate px-4">{uploadedFile}</h3>
                                        <p className="text-[10px] text-cyan-400/70 font-semibold tracking-wider uppercase mt-1">Scroll Accepted by Oracle</p>

                                        <button
                                            onClick={() => setUploadedFile(null)}
                                            className="mt-6 text-xs text-red-400 hover:text-red-300 underline decoration-red-500/30 underline-offset-4 font-medium"
                                        >
                                            Retract Offering
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Generate Action */}
                        <div className="flex justify-end">
                            <button
                                onClick={handleGenerateQuiz}
                                disabled={!uploadedFile || isGenerating}
                                className={btnClass}
                            >
                                {isGenerating ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <BrainCircuit className="w-5 h-5" />
                                        </motion.div>
                                        Manifesting Knowledge...
                                    </>
                                ) : (
                                    <>
                                        <BrainCircuit className="w-5 h-5" />
                                        Generate Trial (Quiz)
                                    </>
                                )}
                            </button>
                        </div>
                    </section>

                    {/* Sidebar: Past Trials */}
                    <aside className="md:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-foreground/60" />
                            Past Trials (History)
                        </h2>
                        <div className="space-y-3">
                            {[
                                { name: "React_Hooks_Deepdive.pdf", score: "90%", date: "Today", xp: "+450" },
                                { name: "Biology_Ch4_Summary.txt", score: "60%", date: "Yesterday", xp: "+120" },
                                { name: "Design_Patterns.md", score: "100%", date: "3d ago", xp: "+600" },
                            ].map((trial, i) => (
                                <GlassCard
                                    key={i}
                                    glow
                                    glowColor="primary"
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                >
                                    <div className="overflow-hidden pr-4">
                                        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{trial.name}</h4>
                                        <p className="text-xs text-foreground/50 mt-1">{trial.date} • {trial.score}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-1 rounded">{trial.xp} XP</span>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>

                        <GlassCard className="mt-8 p-6" hoverEffect={false}>
                            <h3 className="text-sm font-semibold mb-2 text-[#3b82f6]">Knowledge XP Multiplier</h3>
                            <p className="text-xs text-foreground/60 leading-relaxed mb-4">
                                Passing AI-generated trials yields pure Intelligence and Knowledge stats. Perfect scores grant critical bonuses.
                            </p>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"></div>
                            </div>
                        </GlassCard>
                    </aside>

                </div>
        </div>
    );
}
