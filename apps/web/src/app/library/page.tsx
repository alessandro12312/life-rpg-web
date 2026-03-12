"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileText, Sparkles, ArrowLeft, BookOpen, BrainCircuit } from "lucide-react";
import Link from "next/link";

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

    return (
        <main className="min-h-screen bg-background text-foreground p-4 lg:p-8 font-sans selection:bg-accent/30">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header / Navigation */}
                <header className="flex items-center gap-4 border-b border-surface-border pb-6">
                    <Link href="/">
                        <button className="p-2 hover:bg-surface rounded-full transition-colors text-foreground/60 hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-[#3b82f6]" />
                            The Library
                        </h1>
                        <p className="text-foreground/60">Upload your knowledge. Face the Oracle's trials.</p>
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
                            className={`relative overflow-hidden border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[300px]
                ${isDragging
                                    ? 'border-accent bg-accent/5 scale-[1.02]'
                                    : 'border-surface-border bg-surface/30 hover:border-foreground/30 hover:bg-surface/50'
                                }
              `}
                        >
                            {/* Background Glow */}
                            <div className="absolute inset-0 bg-gradient-radial from-accent/5 to-transparent pointer-events-none" />

                            {!uploadedFile ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="z-10"
                                >
                                    <div className="w-20 h-20 mx-auto bg-surface border border-surface-border rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/50">
                                        <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-accent' : 'text-foreground/40'}`} />
                                    </div>
                                    <h3 className="text-lg font-medium mb-2">Offer your notes to the AI</h3>
                                    <p className="text-sm text-foreground/50 max-w-xs mx-auto">
                                        Drag and drop PDF, Markdown, or Text files here. Maximum 10MB per offering.
                                    </p>
                                    <div className="mt-8 flex items-center justify-center gap-4">
                                        <span className="h-px w-12 bg-surface-border"></span>
                                        <span className="text-xs text-foreground/40 uppercase tracking-widest">or</span>
                                        <span className="h-px w-12 bg-surface-border"></span>
                                    </div>
                                    <button className="mt-6 px-6 py-2 rounded-full border border-surface-border bg-surface hover:bg-foreground hover:text-background transition-colors text-sm font-medium">
                                        Browse Scrolls
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="z-10 w-full"
                                >
                                    <div className="bg-surface border border-surface-border rounded-xl p-6 shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#3b82f6]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <FileText className="w-12 h-12 text-[#3b82f6] mx-auto mb-4" />
                                        <h3 className="font-mono text-lg truncate px-4">{uploadedFile}</h3>
                                        <p className="text-sm text-foreground/50 mt-1">Offering accepted.</p>

                                        <button
                                            onClick={() => setUploadedFile(null)}
                                            className="mt-6 text-xs text-red-500 hover:text-red-400 underline decoration-red-500/30 underline-offset-4"
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
                                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold transition-all
                  ${!uploadedFile
                                        ? 'bg-surface text-foreground/30 cursor-not-allowed'
                                        : isGenerating
                                            ? 'bg-accent/20 text-accent border border-accent/50 cursor-wait'
                                            : 'bg-primary text-[#09090b] shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:scale-[1.02]'
                                    }
                `}
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
                                <div key={i} className="bg-surface/30 border border-surface-border p-4 rounded-xl flex items-center justify-between hover:bg-surface/50 transition-colors cursor-pointer group">
                                    <div className="overflow-hidden pr-4">
                                        <h4 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{trial.name}</h4>
                                        <p className="text-xs text-foreground/50 mt-1">{trial.date} • {trial.score}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-mono text-primary font-bold bg-primary/10 px-2 py-1 rounded">{trial.xp} XP</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 p-6 bg-surface/50 border border-surface-border rounded-2xl">
                            <h3 className="text-sm font-semibold mb-2 text-[#3b82f6]">Knowledge XP Multiplier</h3>
                            <p className="text-xs text-foreground/60 leading-relaxed mb-4">
                                Passing AI-generated trials yields pure Intelligence and Knowledge stats. Perfect scores grant critical bonuses.
                            </p>
                            <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"></div>
                            </div>
                        </div>
                    </aside>

                </div>
            </div>
        </main>
    );
}
