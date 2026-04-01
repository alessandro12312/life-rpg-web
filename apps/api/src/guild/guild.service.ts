import { Injectable, NotFoundException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/** Catalogo delle quest settimanali auto-generate per ogni gilda */
const WEEKLY_QUEST_TEMPLATES = [
    { title: 'Maratona di Studio', description: 'Accumulate minuti di studio collettivamente.', category: 'STUDY', target_minutes: 500, xp_reward: 500 },
    { title: 'Guerrieri del Fitness', description: 'Accumulate minuti di allenamento collettivamente.', category: 'WORKOUT', target_minutes: 300, xp_reward: 500 },
    { title: 'Sfida Mista', description: 'Accumulate minuti di qualsiasi attività collettivamente.', category: 'MIXED', target_minutes: 600, xp_reward: 750 },
];

@Injectable()
export class GuildService {
    constructor(private readonly supabase: SupabaseService) {}

    /** Lista tutte le gilde con conteggio membri */
    async listGuilds() {
        const { data, error } = await this.supabase.getClient()
            .from('guilds')
            .select('*, guild_members(count)')
            .order('created_at', { ascending: false });

        if (error) throw new InternalServerErrorException('Errore nel caricamento delle gilde');

        return (data || []).map((g: any) => ({
            ...g,
            member_count: g.guild_members?.[0]?.count || 0,
            guild_members: undefined,
        }));
    }

    /** Crea una nuova gilda e aggiunge il creatore come LEADER */
    async createGuild(userId: string, dto: { name: string; description?: string; motto?: string }) {
        const client = this.supabase.getClient();

        // Verifica che l'utente non sia già in una gilda
        const { data: existing } = await client
            .from('guild_members')
            .select('guild_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) throw new BadRequestException('Sei già membro di una gilda. Abbandonala prima di crearne una nuova.');

        // Crea la gilda
        const { data: guild, error } = await client
            .from('guilds')
            .insert({
                name: dto.name,
                description: dto.description || null,
                motto: dto.motto || null,
                leader_id: userId,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') throw new BadRequestException('Una gilda con questo nome esiste già.');
            throw new InternalServerErrorException('Errore nella creazione della gilda');
        }

        // Aggiungi il creatore come LEADER
        await client.from('guild_members').insert({
            guild_id: guild.id,
            user_id: userId,
            role: 'LEADER',
        });

        // Genera le quest settimanali iniziali
        await this.ensureWeeklyQuests(guild.id);

        return guild;
    }

    /** Dettaglio gilda con membri e quest attive */
    async getGuildDetail(guildId: string) {
        const client = this.supabase.getClient();

        const { data: guild, error } = await client
            .from('guilds')
            .select('*')
            .eq('id', guildId)
            .single();

        if (error || !guild) throw new NotFoundException('Gilda non trovata');

        // Fetch membri con info utente
        const { data: members } = await client
            .from('guild_members')
            .select('user_id, role, joined_at, users(username, avatar_url, level, class_name, race)')
            .eq('guild_id', guildId)
            .order('role', { ascending: true });

        // Fetch quest settimana corrente
        const weekStart = this.getWeekStart();
        const { data: quests } = await client
            .from('guild_quests')
            .select('*')
            .eq('guild_id', guildId)
            .eq('week_start', weekStart);

        return {
            ...guild,
            members: (members || []).map((m: any) => ({
                user_id: m.user_id,
                role: m.role,
                joined_at: m.joined_at,
                username: m.users?.username,
                avatar_url: m.users?.avatar_url,
                level: m.users?.level,
                class_name: m.users?.class_name,
                race: m.users?.race,
            })),
            quests: quests || [],
        };
    }

    /** La gilda dell'utente corrente */
    async getMyGuild(userId: string) {
        const client = this.supabase.getClient();

        const { data: membership } = await client
            .from('guild_members')
            .select('guild_id, role')
            .eq('user_id', userId)
            .maybeSingle();

        if (!membership) return null;

        const detail = await this.getGuildDetail(membership.guild_id);
        return { ...detail, myRole: membership.role };
    }

    /** Unisciti a una gilda */
    async joinGuild(userId: string, guildId: string) {
        const client = this.supabase.getClient();

        // Verifica che l'utente non sia già in una gilda
        const { data: existing } = await client
            .from('guild_members')
            .select('guild_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existing) throw new BadRequestException('Sei già membro di una gilda.');

        // Verifica che la gilda esista e non sia piena
        const { data: guild } = await client
            .from('guilds')
            .select('id, max_members')
            .eq('id', guildId)
            .single();

        if (!guild) throw new NotFoundException('Gilda non trovata');

        const { count } = await client
            .from('guild_members')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', guildId);

        if ((count || 0) >= guild.max_members) throw new BadRequestException('La gilda è piena.');

        const { error } = await client.from('guild_members').insert({
            guild_id: guildId,
            user_id: userId,
            role: 'MEMBER',
        });

        if (error) throw new InternalServerErrorException('Errore nel join alla gilda');

        return { success: true };
    }

    /** Abbandona la gilda */
    async leaveGuild(userId: string, guildId: string) {
        const client = this.supabase.getClient();

        const { data: membership } = await client
            .from('guild_members')
            .select('role')
            .eq('guild_id', guildId)
            .eq('user_id', userId)
            .single();

        if (!membership) throw new NotFoundException('Non sei membro di questa gilda');

        // Se è il leader, trasferisci a un officer o sciogli la gilda
        if (membership.role === 'LEADER') {
            const { data: officers } = await client
                .from('guild_members')
                .select('user_id')
                .eq('guild_id', guildId)
                .eq('role', 'OFFICER')
                .limit(1);

            if (officers && officers.length > 0) {
                // Trasferisci leadership al primo officer
                await client.from('guilds').update({ leader_id: officers[0].user_id }).eq('id', guildId);
                await client.from('guild_members').update({ role: 'LEADER' }).eq('guild_id', guildId).eq('user_id', officers[0].user_id);
            } else {
                // Nessun officer — controlla se ci sono altri membri
                const { count } = await client
                    .from('guild_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('guild_id', guildId)
                    .neq('user_id', userId);

                if ((count || 0) === 0) {
                    // Nessun altro membro: sciogli la gilda
                    await client.from('guilds').delete().eq('id', guildId);
                    return { success: true, disbanded: true };
                } else {
                    // Promuovi il membro più anziano
                    const { data: oldest } = await client
                        .from('guild_members')
                        .select('user_id')
                        .eq('guild_id', guildId)
                        .neq('user_id', userId)
                        .order('joined_at', { ascending: true })
                        .limit(1);

                    if (oldest && oldest.length > 0) {
                        await client.from('guilds').update({ leader_id: oldest[0].user_id }).eq('id', guildId);
                        await client.from('guild_members').update({ role: 'LEADER' }).eq('guild_id', guildId).eq('user_id', oldest[0].user_id);
                    }
                }
            }
        }

        await client.from('guild_members').delete().eq('guild_id', guildId).eq('user_id', userId);
        return { success: true };
    }

    /** Espelli un membro (solo Leader/Officer) */
    async kickMember(requesterId: string, guildId: string, targetUserId: string) {
        const client = this.supabase.getClient();

        // Verifica ruolo del richiedente
        const { data: requester } = await client
            .from('guild_members')
            .select('role')
            .eq('guild_id', guildId)
            .eq('user_id', requesterId)
            .single();

        if (!requester || (requester.role !== 'LEADER' && requester.role !== 'OFFICER')) {
            throw new ForbiddenException('Solo il Leader o un Officer possono espellere membri');
        }

        // Non puoi espellere il leader
        const { data: target } = await client
            .from('guild_members')
            .select('role')
            .eq('guild_id', guildId)
            .eq('user_id', targetUserId)
            .single();

        if (!target) throw new NotFoundException('Utente non trovato nella gilda');
        if (target.role === 'LEADER') throw new ForbiddenException('Non puoi espellere il Leader');
        if (target.role === 'OFFICER' && requester.role !== 'LEADER') {
            throw new ForbiddenException('Solo il Leader può espellere un Officer');
        }

        await client.from('guild_members').delete().eq('guild_id', guildId).eq('user_id', targetUserId);
        return { success: true };
    }

    /** Promuovi un membro a Officer (solo Leader) */
    async promoteMember(requesterId: string, guildId: string, targetUserId: string) {
        const client = this.supabase.getClient();

        // Verifica che il richiedente sia il leader
        const { data: requester } = await client
            .from('guild_members')
            .select('role')
            .eq('guild_id', guildId)
            .eq('user_id', requesterId)
            .single();

        if (!requester || requester.role !== 'LEADER') {
            throw new ForbiddenException('Solo il Leader può promuovere membri');
        }

        const { data: target } = await client
            .from('guild_members')
            .select('role')
            .eq('guild_id', guildId)
            .eq('user_id', targetUserId)
            .single();

        if (!target) throw new NotFoundException('Utente non trovato nella gilda');
        if (target.role !== 'MEMBER') throw new BadRequestException('Questo utente è già Officer o Leader');

        await client.from('guild_members').update({ role: 'OFFICER' }).eq('guild_id', guildId).eq('user_id', targetUserId);
        return { success: true };
    }

    /**
     * Aggiorna il progresso delle quest della gilda quando un membro logga un'attività.
     * Chiamato dal PlayerService.logActivity().
     */
    async updateGuildQuestProgress(userId: string, category: string, durationMinutes: number) {
        const client = this.supabase.getClient();

        // Trova la gilda dell'utente
        const { data: membership } = await client
            .from('guild_members')
            .select('guild_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (!membership) return; // Non è in nessuna gilda

        const weekStart = this.getWeekStart();

        // Assicura che esistano le quest per questa settimana
        await this.ensureWeeklyQuests(membership.guild_id);

        // Aggiorna quest matching per categoria
        const categoriesToUpdate = [category, 'MIXED']; // L'attività conta anche per la quest MIXED

        for (const cat of categoriesToUpdate) {
            const { data: quest } = await client
                .from('guild_quests')
                .select('id, current_minutes, target_minutes, completed')
                .eq('guild_id', membership.guild_id)
                .eq('week_start', weekStart)
                .eq('category', cat)
                .eq('completed', false)
                .maybeSingle();

            if (quest) {
                const newMinutes = quest.current_minutes + durationMinutes;
                const isCompleted = newMinutes >= quest.target_minutes;

                await client
                    .from('guild_quests')
                    .update({
                        current_minutes: newMinutes,
                        completed: isCompleted,
                    })
                    .eq('id', quest.id);

                // Se completata, assegna XP alla gilda
                if (isCompleted) {
                    await this.addGuildXp(membership.guild_id, quest.target_minutes);
                }
            }
        }
    }

    /** Aggiunge XP alla gilda e gestisce il level up */
    private async addGuildXp(guildId: string, xpAmount: number) {
        const client = this.supabase.getClient();

        const { data: guild } = await client
            .from('guilds')
            .select('xp_current, level')
            .eq('id', guildId)
            .single();

        if (!guild) return;

        const newXp = guild.xp_current + xpAmount;
        const xpToNextLevel = 1000 * Math.pow(guild.level, 1.5);
        const newLevel = newXp >= xpToNextLevel ? guild.level + 1 : guild.level;
        const finalXp = newXp >= xpToNextLevel ? newXp - xpToNextLevel : newXp;

        await client.from('guilds').update({
            xp_current: finalXp,
            level: newLevel,
        }).eq('id', guildId);
    }

    /** Genera le quest settimanali se non esistono per la settimana corrente */
    private async ensureWeeklyQuests(guildId: string) {
        const weekStart = this.getWeekStart();
        const client = this.supabase.getClient();

        const { count } = await client
            .from('guild_quests')
            .select('*', { count: 'exact', head: true })
            .eq('guild_id', guildId)
            .eq('week_start', weekStart);

        if ((count || 0) > 0) return; // Già generate

        const quests = WEEKLY_QUEST_TEMPLATES.map(t => ({
            guild_id: guildId,
            title: t.title,
            description: t.description,
            category: t.category,
            target_minutes: t.target_minutes,
            xp_reward: t.xp_reward,
            week_start: weekStart,
        }));

        await client.from('guild_quests').insert(quests);
    }

    /** Ritorna il lunedì della settimana corrente in formato ISO date */
    private getWeekStart(): string {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lunedì
        const monday = new Date(now);
        monday.setDate(diff);
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0];
    }
}
