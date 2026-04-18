import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
    deriveCombatStats,
    scaleBossStats,
    calculateDamage,
    calculateHealing,
    rollCritical,
    rollMiss,
    applyStatusEffects,
    tickStatusEffects,
    decideBossAction,
    calculateRewards,
    StatusEffect,
    CharacterStats,
} from './battle-combat.engine';
import { getCombatSkillById, getSkillsForClass, CombatSkill } from './constants/combat-skills';
import { getItemById } from './constants/items-catalog';

@Injectable()
export class BattleService {
    constructor(private readonly supabase: SupabaseService) {}

    // ═══════════════════════════════════════════════════════════════════════
    // Boss Management
    // ═══════════════════════════════════════════════════════════════════════

    /** Create a new boss definition */
    async createBoss(userId: string, dto: {
        name: string;
        description?: string;
        boss_type?: string;
        tier: number;
        difficulty_factor: number;
        phase_count?: number;
        source_goal_id?: string;
    }) {
        const phaseCount = dto.phase_count || Math.min(3, Math.ceil(dto.tier / 2));
        const scaled = scaleBossStats(dto.tier, dto.difficulty_factor, 0);

        const xpReward = Math.floor(100 * dto.tier * dto.difficulty_factor * phaseCount);

        // Loot table based on tier
        const lootTable = this.generateLootTable(dto.tier);

        const { data, error } = await this.supabase.getClient()
            .from('bosses')
            .insert({
                creator_id: userId,
                name: dto.name,
                description: dto.description || null,
                boss_type: dto.boss_type || 'GOAL',
                tier: dto.tier,
                difficulty_factor: dto.difficulty_factor,
                phase_count: phaseCount,
                base_hp: scaled.hp,
                base_atk: scaled.atk,
                base_def: scaled.def,
                xp_reward: xpReward,
                loot_table: lootTable,
                source_goal_id: dto.source_goal_id || null,
            })
            .select()
            .single();

        if (error) throw new InternalServerErrorException('Errore nella creazione del boss');
        return data;
    }

    /** List bosses available for the user (own + templates) */
    async listBosses(userId: string) {
        const { data, error } = await this.supabase.getClient()
            .from('bosses')
            .select('*')
            .or(`creator_id.eq.${userId},is_template.eq.true`)
            .order('created_at', { ascending: false });

        if (error) throw new InternalServerErrorException('Errore nel recupero dei boss');
        return data ?? [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Battle Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    /** Start a new battle instance */
    async startBattle(userId: string, dto: { boss_id: string; mode?: string }) {
        const client = this.supabase.getClient();
        const mode = dto.mode || 'SOLO';

        // Fetch boss
        const { data: boss, error: bossError } = await client
            .from('bosses').select('*').eq('id', dto.boss_id).single();
        if (bossError || !boss) throw new NotFoundException('Boss non trovato');

        // Check player isn't already in an active battle
        const { data: activeBattles } = await client
            .from('battle_participants')
            .select('battle_id, battles!inner(status)')
            .eq('user_id', userId)
            .in('battles.status', ['WAITING', 'ACTIVE']);
        if (activeBattles && activeBattles.length > 0) {
            throw new BadRequestException('Sei già in una battaglia attiva. Concludila o abbandonala prima.');
        }

        // Scale boss stats for phase 1
        const phase1Stats = scaleBossStats(boss.tier, boss.difficulty_factor, 0);

        // Create battle
        const { data: battle, error: battleError } = await client
            .from('battles')
            .insert({
                boss_id: boss.id,
                status: 'ACTIVE',
                mode,
                current_phase: 1,
                current_turn: 1,
                boss_current_hp: phase1Stats.hp,
                boss_max_hp: phase1Stats.hp,
                boss_atk: phase1Stats.atk,
                boss_def: phase1Stats.def,
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (battleError || !battle) throw new InternalServerErrorException('Errore nella creazione della battaglia');

        // Derive player combat stats
        const playerCombatStats = await this.derivePlayerCombatStats(userId);

        // Add player as participant
        const { error: participantError } = await client
            .from('battle_participants')
            .insert({
                battle_id: battle.id,
                user_id: userId,
                max_hp: playerCombatStats.maxHp,
                current_hp: playerCombatStats.maxHp,
                atk: playerCombatStats.atk,
                def: playerCombatStats.def,
                spd: playerCombatStats.spd,
                mana: playerCombatStats.mana,
                max_mana: playerCombatStats.mana,
                turn_order: 1,
            });

        if (participantError) throw new InternalServerErrorException('Errore nell\'aggiunta del partecipante');

        // Set active participant
        await client.from('battles')
            .update({ active_participant_id: userId })
            .eq('id', battle.id);

        return this.getBattleState(battle.id, userId);
    }

    /** Join an existing party battle */
    async joinBattle(userId: string, battleId: string) {
        const client = this.supabase.getClient();

        const { data: battle } = await client
            .from('battles').select('*').eq('id', battleId).single();
        if (!battle) throw new NotFoundException('Battaglia non trovata');
        if (battle.status !== 'WAITING' && battle.status !== 'ACTIVE') {
            throw new BadRequestException('La battaglia non è accessibile');
        }
        if (battle.mode === 'SOLO') {
            throw new BadRequestException('Non puoi unirti a una battaglia solo');
        }

        // Check if already participating
        const { data: existing } = await client
            .from('battle_participants')
            .select('id')
            .eq('battle_id', battleId)
            .eq('user_id', userId)
            .maybeSingle();
        if (existing) throw new BadRequestException('Sei già in questa battaglia');

        // Check max participants (4 for party)
        const { count } = await client
            .from('battle_participants')
            .select('*', { count: 'exact', head: true })
            .eq('battle_id', battleId);
        if ((count || 0) >= 4) throw new BadRequestException('La battaglia è piena (max 4 giocatori)');

        const playerCombatStats = await this.derivePlayerCombatStats(userId);

        await client.from('battle_participants').insert({
            battle_id: battleId,
            user_id: userId,
            max_hp: playerCombatStats.maxHp,
            current_hp: playerCombatStats.maxHp,
            atk: playerCombatStats.atk,
            def: playerCombatStats.def,
            spd: playerCombatStats.spd,
            mana: playerCombatStats.mana,
            max_mana: playerCombatStats.mana,
            turn_order: (count || 0) + 1,
        });

        return this.getBattleState(battleId, userId);
    }

    /** Get full battle state */
    async getBattleState(battleId: string, userId: string) {
        const client = this.supabase.getClient();

        const { data: battle } = await client
            .from('battles')
            .select('*, bosses(*)')
            .eq('id', battleId)
            .single();
        if (!battle) throw new NotFoundException('Battaglia non trovata');

        const { data: participants } = await client
            .from('battle_participants')
            .select('*, users(username, class_name, race, avatar_id)')
            .eq('battle_id', battleId)
            .order('turn_order', { ascending: true });

        const { data: logs } = await client
            .from('battle_logs')
            .select('*')
            .eq('battle_id', battleId)
            .order('created_at', { ascending: false })
            .limit(20);

        // Get available skills for current player
        const currentPlayer = (participants || []).find((p: any) => p.user_id === userId);
        const className = currentPlayer?.users?.class_name || 'warrior';
        const availableSkills = getSkillsForClass(className);

        // Get player inventory
        const { data: inventory } = await client
            .from('player_inventory')
            .select('*')
            .eq('user_id', userId);

        return {
            battle: {
                id: battle.id,
                status: battle.status,
                mode: battle.mode,
                currentPhase: battle.current_phase,
                totalPhases: battle.bosses?.phase_count || 1,
                currentTurn: battle.current_turn,
                activeParticipantId: battle.active_participant_id,
                turnDeadline: battle.turn_deadline,
                startedAt: battle.started_at,
                endedAt: battle.ended_at,
            },
            boss: {
                id: battle.bosses?.id,
                name: battle.bosses?.name || 'Unknown Boss',
                description: battle.bosses?.description,
                type: battle.bosses?.boss_type,
                tier: battle.bosses?.tier || 1,
                currentHp: battle.boss_current_hp,
                maxHp: battle.boss_max_hp,
                atk: battle.boss_atk,
                def: battle.boss_def,
            },
            participants: (participants || []).map((p: any) => ({
                id: p.id,
                userId: p.user_id,
                username: p.users?.username || 'Unknown',
                className: p.users?.class_name || 'Warrior',
                race: p.users?.race || 'Human',
                avatarId: p.users?.avatar_id,
                maxHp: p.max_hp,
                currentHp: p.current_hp,
                atk: p.atk,
                def: p.def,
                spd: p.spd,
                mana: p.mana,
                maxMana: p.max_mana,
                isDefending: p.is_defending,
                statusEffects: p.status_effects || [],
                turnOrder: p.turn_order,
                xpEarned: p.xp_earned,
            })),
            logs: (logs || []).map((l: any) => ({
                turnNumber: l.turn_number,
                actorType: l.actor_type,
                actorId: l.actor_id,
                actionType: l.action_type,
                skillId: l.skill_id,
                damageDealt: l.damage_dealt,
                damageBlocked: l.damage_blocked,
                healingDone: l.healing_done,
                isCritical: l.is_critical,
                isMiss: l.is_miss,
                narrative: l.narrative,
                createdAt: l.created_at,
            })),
            availableSkills: availableSkills.map(s => ({
                id: s.id,
                name: s.name,
                description: s.description,
                manaCost: s.manaCost,
                cooldown: s.cooldown,
                effectType: s.effect.type,
            })),
            inventory: (inventory || [])
                .filter((inv: any) => {
                    const item = getItemById(inv.item_id);
                    return item && item.category !== 'MATERIAL';
                })
                .map((inv: any) => {
                    const item = getItemById(inv.item_id)!;
                    return {
                        itemId: inv.item_id,
                        name: item.name,
                        description: item.description,
                        quantity: inv.quantity,
                        effectType: item.effect.type,
                    };
                }),
        };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Combat Actions
    // ═══════════════════════════════════════════════════════════════════════

    /** Submit a player action for the current turn */
    async submitAction(userId: string, battleId: string, dto: {
        action: string;
        skill_id?: string;
        item_id?: string;
    }) {
        const client = this.supabase.getClient();

        // Fetch battle
        const { data: battle } = await client
            .from('battles').select('*, bosses(*)').eq('id', battleId).single();
        if (!battle) throw new NotFoundException('Battaglia non trovata');
        if (battle.status !== 'ACTIVE') throw new BadRequestException('La battaglia non è attiva');

        // Verify it's the player's turn
        if (battle.active_participant_id !== userId) {
            throw new ForbiddenException('Non è il tuo turno');
        }

        // Fetch participant
        const { data: participant } = await client
            .from('battle_participants')
            .select('*')
            .eq('battle_id', battleId)
            .eq('user_id', userId)
            .single();
        if (!participant) throw new NotFoundException('Partecipante non trovato');
        if (participant.current_hp <= 0) throw new BadRequestException('Il tuo personaggio è KO');

        // Fetch user info for combat formulas
        const { data: userInfo } = await client
            .from('users')
            .select('class_name')
            .eq('id', userId)
            .single();

        // Fetch character stats for crit calculation
        const { data: charStats } = await client
            .from('character_stats')
            .select('focus')
            .eq('user_id', userId)
            .single();

        const focusStat = charStats?.focus || 1;
        const statusEffects: StatusEffect[] = participant.status_effects || [];

        // Effective stats after status effects
        const effectiveAtk = applyStatusEffects(participant.atk, 'atk', statusEffects);
        const effectiveDef = applyStatusEffects(participant.def, 'def', statusEffects);

        const turnLogs: any[] = [];
        let bossHp = battle.boss_current_hp;
        let playerHp = participant.current_hp;
        let playerMana = participant.mana;
        let isDefending = false;
        let newStatusEffects = [...statusEffects];

        // ─── Process Player Action ──────────────────────────────────────
        switch (dto.action) {
            case 'ATTACK': {
                const isMiss = rollMiss(applyStatusEffects(participant.spd, 'spd', statusEffects), 10);
                const isCrit = !isMiss && rollCritical(focusStat);
                const damage = isMiss ? 0 : calculateDamage(
                    effectiveAtk,
                    applyStatusEffects(battle.boss_def, 'def', []), // boss has no buffs from players
                    1.0,
                    isCrit,
                );
                bossHp = Math.max(0, bossHp - damage);

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'PLAYER',
                    actor_id: userId,
                    action_type: 'ATTACK',
                    target_type: 'BOSS',
                    damage_dealt: damage,
                    is_critical: isCrit,
                    is_miss: isMiss,
                    narrative: isMiss
                        ? 'Il tuo attacco è andato a vuoto!'
                        : isCrit
                            ? `Colpo critico! Hai inflitto ${damage} danni!`
                            : `Hai inflitto ${damage} danni!`,
                });
                break;
            }

            case 'SKILL': {
                if (!dto.skill_id) throw new BadRequestException('skill_id è richiesto per le abilità');

                const skill = getCombatSkillById(dto.skill_id);
                if (!skill) throw new BadRequestException('Abilità sconosciuta');

                // Verify class can use this skill
                const className = (userInfo?.class_name || 'warrior').toLowerCase();
                if (!skill.classes.includes('*') && !skill.classes.includes(className)) {
                    throw new ForbiddenException('La tua classe non può usare questa abilità');
                }

                // Mana check
                if (playerMana < skill.manaCost) {
                    throw new BadRequestException('Mana insufficiente');
                }
                playerMana -= skill.manaCost;

                const result = this.processSkillEffect(
                    skill, effectiveAtk, battle.boss_def, focusStat,
                    playerHp, participant.max_hp, bossHp, newStatusEffects,
                );

                bossHp = result.bossHp;
                playerHp = result.playerHp;
                newStatusEffects = result.statusEffects;

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'PLAYER',
                    actor_id: userId,
                    action_type: 'SKILL',
                    skill_id: dto.skill_id,
                    target_type: skill.effect.type === 'HEAL' || skill.effect.type === 'BUFF' ? 'PLAYER' : 'BOSS',
                    target_id: skill.effect.type === 'HEAL' || skill.effect.type === 'BUFF' ? userId : null,
                    damage_dealt: result.damageDealt,
                    healing_done: result.healingDone,
                    is_critical: result.isCritical,
                    is_miss: false,
                    narrative: result.narrative,
                });
                break;
            }

            case 'DEFEND': {
                isDefending = true;
                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'PLAYER',
                    actor_id: userId,
                    action_type: 'DEFEND',
                    narrative: 'Ti metti in posizione difensiva! Danno ridotto del 50% questo turno.',
                });
                break;
            }

            case 'ITEM': {
                if (!dto.item_id) throw new BadRequestException('item_id è richiesto per usare un oggetto');

                const item = getItemById(dto.item_id);
                if (!item) throw new BadRequestException('Oggetto sconosciuto');

                // Check inventory
                const { data: invItem } = await client
                    .from('player_inventory')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('item_id', dto.item_id)
                    .single();
                if (!invItem || invItem.quantity <= 0) {
                    throw new BadRequestException('Non possiedi questo oggetto');
                }

                // Consume item
                if (invItem.quantity <= 1) {
                    await client.from('player_inventory')
                        .delete()
                        .eq('user_id', userId)
                        .eq('item_id', dto.item_id);
                } else {
                    await client.from('player_inventory')
                        .update({ quantity: invItem.quantity - 1 })
                        .eq('user_id', userId)
                        .eq('item_id', dto.item_id);
                }

                const itemResult = this.processItemEffect(
                    item, playerHp, participant.max_hp, playerMana, participant.max_mana,
                    bossHp, newStatusEffects, participant,
                );

                playerHp = itemResult.playerHp;
                playerMana = itemResult.playerMana;
                bossHp = itemResult.bossHp;
                newStatusEffects = itemResult.statusEffects;

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'PLAYER',
                    actor_id: userId,
                    action_type: 'ITEM',
                    target_type: item.effect.type === 'DAMAGE' ? 'BOSS' : 'PLAYER',
                    target_id: item.effect.type === 'DAMAGE' ? null : userId,
                    damage_dealt: itemResult.damageDealt,
                    healing_done: itemResult.healingDone,
                    narrative: itemResult.narrative,
                });
                break;
            }

            default:
                throw new BadRequestException('Azione non valida');
        }

        // ─── Check Boss Defeat / Phase Transition ───────────────────────
        let currentPhase = battle.current_phase;
        const totalPhases = battle.bosses?.phase_count || 1;
        let battleStatus = battle.status;
        let endedAt: string | null = null;

        if (bossHp <= 0) {
            if (currentPhase < totalPhases) {
                // Phase transition
                currentPhase += 1;
                const nextPhaseStats = scaleBossStats(
                    battle.bosses?.tier || 1,
                    battle.bosses?.difficulty_factor || 1.0,
                    currentPhase - 1, // 0-based index
                );
                bossHp = nextPhaseStats.hp;

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'BOSS',
                    action_type: 'BOSS_ATTACK',
                    narrative: `⚡ ${battle.bosses?.name || 'Il Boss'} entra nella Fase ${currentPhase}! Si trasforma e diventa più potente!`,
                });

                await client.from('battles').update({
                    current_phase: currentPhase,
                    boss_current_hp: bossHp,
                    boss_max_hp: nextPhaseStats.hp,
                    boss_atk: nextPhaseStats.atk,
                    boss_def: nextPhaseStats.def,
                }).eq('id', battleId);
            } else {
                // Victory!
                battleStatus = 'VICTORY';
                endedAt = new Date().toISOString();

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'BOSS',
                    action_type: 'BOSS_ATTACK',
                    narrative: `🏆 ${battle.bosses?.name || 'Il Boss'} è stato sconfitto! Vittoria!`,
                });
            }
        }

        // ─── Boss Turn (if still alive and not victory) ─────────────────
        if (bossHp > 0 && battleStatus === 'ACTIVE') {
            const allParticipants = await this.getAliveParticipants(battleId);
            const effectiveBossAtk = applyStatusEffects(
                battle.boss_atk,
                'atk',
                [], // Boss doesn't have persistent status effects from players in this simple model
            );

            const bossAction = decideBossAction(
                battle.bosses?.name || 'Boss',
                effectiveBossAtk,
                allParticipants.map(p => ({
                    userId: p.user_id,
                    currentHp: p.user_id === userId ? playerHp : p.current_hp,
                    maxHp: p.max_hp,
                    isAlive: (p.user_id === userId ? playerHp : p.current_hp) > 0,
                })),
                currentPhase,
                battle.current_turn,
            );

            // Calculate boss damage
            const targetParticipant = bossAction.targetId === userId
                ? { ...participant, current_hp: playerHp, is_defending: isDefending, status_effects: newStatusEffects }
                : allParticipants.find(p => p.user_id === bossAction.targetId);

            if (targetParticipant) {
                const targetDefending = bossAction.targetId === userId
                    ? isDefending
                    : targetParticipant.is_defending || false;
                const targetEffects: StatusEffect[] = bossAction.targetId === userId
                    ? newStatusEffects
                    : (targetParticipant.status_effects || []);
                const targetEffectiveDef = applyStatusEffects(
                    bossAction.targetId === userId ? participant.def : targetParticipant.def,
                    'def',
                    targetEffects,
                );

                const bossDamage = calculateDamage(
                    effectiveBossAtk,
                    targetEffectiveDef,
                    bossAction.skillMultiplier,
                    false, // bosses don't crit in base model
                    targetDefending,
                );

                const damageBlocked = targetDefending ? Math.floor(bossDamage) : 0;

                // Apply damage
                if (bossAction.targetId === userId) {
                    playerHp = Math.max(0, playerHp - bossDamage);
                } else {
                    const newTargetHp = Math.max(0, targetParticipant.current_hp - bossDamage);
                    await client.from('battle_participants')
                        .update({ current_hp: newTargetHp })
                        .eq('battle_id', battleId)
                        .eq('user_id', bossAction.targetId);
                }

                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'BOSS',
                    action_type: bossAction.actionType,
                    target_type: 'PLAYER',
                    target_id: bossAction.targetId,
                    damage_dealt: bossDamage,
                    damage_blocked: damageBlocked,
                    narrative: `${bossAction.narrative} Infligge ${bossDamage} danni!${targetDefending ? ` (${damageBlocked} bloccati dalla difesa)` : ''}`,
                });
            }

            // Check if all players are KO
            const allParticipantsAfter = await this.getAliveParticipants(battleId);
            const currentPlayerAlive = playerHp > 0;
            const othersAlive = allParticipantsAfter
                .filter(p => p.user_id !== userId)
                .some(p => p.current_hp > 0);

            if (!currentPlayerAlive && !othersAlive) {
                battleStatus = 'DEFEAT';
                endedAt = new Date().toISOString();
                turnLogs.push({
                    battle_id: battleId,
                    turn_number: battle.current_turn,
                    actor_type: 'BOSS',
                    action_type: 'BOSS_ATTACK',
                    narrative: `💀 Il party è stato sconfitto da ${battle.bosses?.name || 'il Boss'}...`,
                });
            }
        }

        // ─── Tick Status Effects ────────────────────────────────────────
        newStatusEffects = tickStatusEffects(newStatusEffects);

        // ─── Update Database ────────────────────────────────────────────
        // Update participant
        await client.from('battle_participants').update({
            current_hp: playerHp,
            mana: playerMana,
            is_defending: isDefending,
            status_effects: newStatusEffects,
        }).eq('battle_id', battleId).eq('user_id', userId);

        // Update battle state
        const battleUpdate: any = {
            boss_current_hp: Math.max(0, bossHp),
            current_turn: battle.current_turn + 1,
            status: battleStatus,
        };
        if (endedAt) battleUpdate.ended_at = endedAt;

        // In solo, the active participant stays the same. In party, rotate.
        if (battle.mode !== 'SOLO') {
            const nextParticipant = await this.getNextActiveParticipant(battleId, userId);
            if (nextParticipant) {
                battleUpdate.active_participant_id = nextParticipant.user_id;
            }
        }

        await client.from('battles').update(battleUpdate).eq('id', battleId);

        // ─── Insert Logs ────────────────────────────────────────────────
        if (turnLogs.length > 0) {
            await client.from('battle_logs').insert(turnLogs);
        }

        // ─── Handle Rewards on Victory/Defeat ───────────────────────────
        let rewards = null;
        if (battleStatus === 'VICTORY' || battleStatus === 'DEFEAT') {
            rewards = await this.distributeBattleRewards(battleId, battleStatus);
        }

        // Return updated state
        const fullState = await this.getBattleState(battleId, userId);
        return { ...fullState, rewards, turnLogs: turnLogs.map(l => ({
            actorType: l.actor_type,
            actionType: l.action_type,
            damageDealt: l.damage_dealt,
            healingDone: l.healing_done,
            isCritical: l.is_critical,
            isMiss: l.is_miss,
            narrative: l.narrative,
            damageBlocked: l.damage_blocked,
        })) };
    }

    /** Abandon a battle */
    async abandonBattle(userId: string, battleId: string) {
        const client = this.supabase.getClient();

        const { data: battle } = await client
            .from('battles').select('status, mode').eq('id', battleId).single();
        if (!battle) throw new NotFoundException('Battaglia non trovata');

        if (battle.status !== 'ACTIVE' && battle.status !== 'WAITING') {
            throw new BadRequestException('La battaglia è già terminata');
        }

        if (battle.mode === 'SOLO') {
            // Solo: end the battle
            await client.from('battles').update({
                status: 'ABANDONED',
                ended_at: new Date().toISOString(),
            }).eq('id', battleId);
        } else {
            // Party: remove participant, if last one, end battle
            await client.from('battle_participants')
                .delete()
                .eq('battle_id', battleId)
                .eq('user_id', userId);

            const { count } = await client
                .from('battle_participants')
                .select('*', { count: 'exact', head: true })
                .eq('battle_id', battleId);

            if ((count || 0) === 0) {
                await client.from('battles').update({
                    status: 'ABANDONED',
                    ended_at: new Date().toISOString(),
                }).eq('id', battleId);
            }
        }

        return { success: true };
    }

    /** Get battle log */
    async getBattleLog(battleId: string) {
        const { data, error } = await this.supabase.getClient()
            .from('battle_logs')
            .select('*')
            .eq('battle_id', battleId)
            .order('turn_number', { ascending: true })
            .order('created_at', { ascending: true });

        if (error) throw new InternalServerErrorException('Errore nel recupero del battle log');
        return data ?? [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════

    private async derivePlayerCombatStats(userId: string) {
        const client = this.supabase.getClient();

        const { data: user } = await client
            .from('users')
            .select('level')
            .eq('id', userId)
            .single();

        const { data: stats } = await client
            .from('character_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!user || !stats) throw new NotFoundException('Player stats non trovati');

        const charStats: CharacterStats = {
            intelligence: Number(stats.intelligence) || 1,
            strength: Number(stats.strength) || 1,
            endurance: Number(stats.endurance) || 1,
            discipline: Number(stats.discipline) || 1,
            focus: Number(stats.focus) || 1,
            knowledge: Number(stats.knowledge) || 1,
            health: Number(stats.health) || 1,
        };

        return deriveCombatStats(user.level, charStats);
    }

    private async getAliveParticipants(battleId: string) {
        const { data } = await this.supabase.getClient()
            .from('battle_participants')
            .select('*')
            .eq('battle_id', battleId);
        return (data || []).filter((p: any) => p.current_hp > 0);
    }

    private async getNextActiveParticipant(battleId: string, currentUserId: string) {
        const alive = await this.getAliveParticipants(battleId);
        const currentIdx = alive.findIndex((p: any) => p.user_id === currentUserId);
        if (alive.length <= 1) return alive[0] || null;
        return alive[(currentIdx + 1) % alive.length];
    }

    private processSkillEffect(
        skill: CombatSkill,
        attackerAtk: number,
        defenderDef: number,
        focusStat: number,
        playerHp: number,
        playerMaxHp: number,
        bossHp: number,
        statusEffects: StatusEffect[],
    ) {
        let damageDealt = 0;
        let healingDone = 0;
        let isCritical = false;
        let narrative = '';
        const newStatusEffects = [...statusEffects];

        switch (skill.effect.type) {
            case 'DAMAGE': {
                isCritical = rollCritical(focusStat);
                damageDealt = calculateDamage(
                    attackerAtk, defenderDef,
                    skill.effect.multiplier || 1.0,
                    isCritical,
                );
                bossHp = Math.max(0, bossHp - damageDealt);
                narrative = isCritical
                    ? `${skill.name} CRITICO! ${damageDealt} danni!`
                    : `${skill.name}: ${damageDealt} danni!`;
                break;
            }
            case 'HEAL': {
                healingDone = calculateHealing(playerMaxHp, playerHp, skill.effect.multiplier || 0.3);
                playerHp = Math.min(playerMaxHp, playerHp + healingDone);
                narrative = `${skill.name}: Recuperi ${healingDone} HP!`;
                break;
            }
            case 'BUFF': {
                newStatusEffects.push({
                    type: 'BUFF',
                    statAffected: skill.effect.statAffected || 'atk',
                    value: skill.effect.value || 0.2,
                    duration: skill.effect.duration || 3,
                    sourceSkillId: skill.id,
                });
                const statLabel = skill.effect.statAffected === 'atk' ? 'Attacco' :
                    skill.effect.statAffected === 'def' ? 'Difesa' : 'Velocità';
                narrative = `${skill.name}: ${statLabel} aumentato del ${Math.floor((skill.effect.value || 0.2) * 100)}% per ${skill.effect.duration} turni!`;
                break;
            }
            case 'DEBUFF': {
                // Debuffs on boss — tracked separately in log but applied to boss stat computation
                narrative = `${skill.name}: ${skill.effect.statAffected === 'atk' ? 'Attacco' : 'Difesa'} del boss ridotto del ${Math.abs(Math.floor((skill.effect.value || 0.25) * 100))}%!`;
                break;
            }
        }

        return {
            bossHp,
            playerHp,
            statusEffects: newStatusEffects,
            damageDealt,
            healingDone,
            isCritical,
            narrative,
        };
    }

    private processItemEffect(
        item: any,
        playerHp: number,
        playerMaxHp: number,
        playerMana: number,
        playerMaxMana: number,
        bossHp: number,
        statusEffects: StatusEffect[],
        participant: any,
    ) {
        let damageDealt = 0;
        let healingDone = 0;
        let narrative = '';
        const newStatusEffects = [...statusEffects];

        switch (item.effect.type) {
            case 'HEAL_HP': {
                const amount = item.effect.isPercentage
                    ? Math.floor(playerMaxHp * item.effect.value)
                    : item.effect.value;
                healingDone = Math.min(amount, playerMaxHp - playerHp);
                playerHp = Math.min(playerMaxHp, playerHp + healingDone);
                narrative = `Usi ${item.name}: +${healingDone} HP!`;
                break;
            }
            case 'HEAL_MANA': {
                const amount = item.effect.isPercentage
                    ? Math.floor(playerMaxMana * item.effect.value)
                    : item.effect.value;
                const manaHealed = Math.min(amount, playerMaxMana - playerMana);
                playerMana = Math.min(playerMaxMana, playerMana + manaHealed);
                narrative = `Usi ${item.name}: +${manaHealed} Mana!`;
                break;
            }
            case 'BUFF_ATK': {
                newStatusEffects.push({
                    type: 'BUFF',
                    statAffected: 'atk',
                    value: item.effect.value,
                    duration: item.effect.duration || 3,
                });
                narrative = `Usi ${item.name}: Attacco +${Math.floor(item.effect.value * 100)}%!`;
                break;
            }
            case 'BUFF_DEF': {
                newStatusEffects.push({
                    type: 'BUFF',
                    statAffected: 'def',
                    value: item.effect.value,
                    duration: item.effect.duration || 3,
                });
                narrative = `Usi ${item.name}: Difesa +${Math.floor(item.effect.value * 100)}%!`;
                break;
            }
            case 'DAMAGE': {
                damageDealt = item.effect.value;
                bossHp = Math.max(0, bossHp - damageDealt);
                narrative = `Usi ${item.name}: ${damageDealt} danni al boss!`;
                break;
            }
        }

        return {
            playerHp,
            playerMana,
            bossHp,
            statusEffects: newStatusEffects,
            damageDealt,
            healingDone,
            narrative,
        };
    }

    private async distributeBattleRewards(battleId: string, status: string) {
        const client = this.supabase.getClient();

        const { data: battle } = await client
            .from('battles')
            .select('*, bosses(*)')
            .eq('id', battleId)
            .single();
        if (!battle) return null;

        const { data: participants } = await client
            .from('battle_participants')
            .select('*')
            .eq('battle_id', battleId);
        if (!participants || participants.length === 0) return null;

        const bossXpReward = battle.bosses?.xp_reward || 200;
        const bossLootTable = battle.bosses?.loot_table || [];
        const anyKOed = participants.some((p: any) => p.current_hp <= 0);

        const rewards = calculateRewards(
            bossXpReward,
            bossLootTable,
            battle.mode,
            participants.length,
            anyKOed,
        );

        // Only award full rewards on victory
        const xpToAward = status === 'VICTORY'
            ? rewards.xpPerPlayer + rewards.bonusXp
            : Math.floor(bossXpReward * 0.1); // consolation XP

        // Award XP to each participant
        for (const participant of participants) {
            // Update participant record
            await client.from('battle_participants')
                .update({ xp_earned: xpToAward })
                .eq('id', participant.id);

            // Update player XP
            const { data: user } = await client
                .from('users')
                .select('xp_current, xp_to_next, level')
                .eq('id', participant.user_id)
                .single();

            if (user) {
                let xp = user.xp_current + xpToAward;
                let lvl = user.level;
                let xpNext = user.xp_to_next;
                while (xp >= xpNext) {
                    lvl += 1;
                    xp -= xpNext;
                    xpNext = Math.floor(1000 * Math.pow(lvl, 1.5));
                }
                await client.from('users')
                    .update({ xp_current: xp, xp_to_next: xpNext, level: lvl })
                    .eq('id', participant.user_id);
            }

            // Award loot on victory
            if (status === 'VICTORY' && rewards.lootDrops.length > 0) {
                for (const loot of rewards.lootDrops) {
                    // Upsert into inventory
                    const { data: existing } = await client
                        .from('player_inventory')
                        .select('quantity')
                        .eq('user_id', participant.user_id)
                        .eq('item_id', loot.itemId)
                        .maybeSingle();

                    if (existing) {
                        await client.from('player_inventory')
                            .update({ quantity: existing.quantity + loot.quantity })
                            .eq('user_id', participant.user_id)
                            .eq('item_id', loot.itemId);
                    } else {
                        await client.from('player_inventory')
                            .insert({
                                user_id: participant.user_id,
                                item_id: loot.itemId,
                                quantity: loot.quantity,
                            });
                    }
                }
            }
        }

        return {
            status,
            xpAwarded: xpToAward,
            bonusXp: status === 'VICTORY' ? rewards.bonusXp : 0,
            lootDrops: status === 'VICTORY' ? rewards.lootDrops : [],
        };
    }

    private generateLootTable(tier: number): Array<{ itemId: string; dropRate: number }> {
        const table: Array<{ itemId: string; dropRate: number }> = [];

        // Common drops
        table.push({ itemId: 'beast_fang', dropRate: 0.6 });
        table.push({ itemId: 'potion_hp_small', dropRate: 0.5 });

        if (tier >= 2) {
            table.push({ itemId: 'potion_mana_small', dropRate: 0.4 });
            table.push({ itemId: 'elixir_strength', dropRate: 0.2 });
        }

        if (tier >= 3) {
            table.push({ itemId: 'potion_hp_large', dropRate: 0.3 });
            table.push({ itemId: 'demon_essence', dropRate: 0.25 });
        }

        if (tier >= 4) {
            table.push({ itemId: 'bomb_fire', dropRate: 0.2 });
            table.push({ itemId: 'elixir_iron_skin', dropRate: 0.15 });
        }

        if (tier >= 5) {
            table.push({ itemId: 'dragon_scale', dropRate: 0.1 });
            table.push({ itemId: 'potion_mana_large', dropRate: 0.2 });
        }

        return table;
    }
}
