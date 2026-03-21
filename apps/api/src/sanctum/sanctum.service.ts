import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';

@Injectable()
export class SanctumService {
    constructor(private readonly supabase: SupabaseService) {}

    async createLobby(userId: string, dto: CreateLobbyDto) {
        const { data, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .insert([{
                title: dto.title,
                category: dto.category,
                max_participants: dto.maxParticipants,
                is_private: dto.isPrivate,
                password: dto.password,
                focus_duration: dto.focusDuration,
                break_duration: dto.breakDuration,
                host_id: userId,
                status: 'WAITING'
            }])
            .select()
            .single();
            
        if (error) throw new Error(error.message);
        return data; 
    }

    async getActiveLobbies() {
        const { data, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('*, host:users!host_id(username, avatar_id, race, class_name)')
            .in('status', ['WAITING', 'FOCUSING'])
            .order('created_at', { ascending: false });
            
        if (error) throw new Error(error.message);
        // Strip out passwords
        return data.map(lobby => ({ ...lobby, password: null }));
    }

    async getLobby(lobbyId: string) {
        const { data: lobby, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('*, host:users!host_id(username, avatar_id, race, class_name)')
            .eq('id', lobbyId)
            .single();
            
        if (error || !lobby) throw new NotFoundException('Lobby non trovata');
        return { ...lobby, password: null };
    }

    async joinLobby(userId: string, lobbyId: string, password?: string) {
        const { data: lobby, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('*')
            .eq('id', lobbyId)
            .single();

        if (error || !lobby) throw new NotFoundException('Lobby non trovata');
        
        if (lobby.is_private && lobby.password !== password) {
            throw new UnauthorizedException('Password errata');
        }

        return { ...lobby, password: null };
    }

    async startLobbyTimer(userId: string, lobbyId: string) {
        const { data: lobby, error: lobbyError } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('host_id')
            .eq('id', lobbyId)
            .single();
            
        if (lobbyError || !lobby) throw new NotFoundException('Lobby non trovata');

        if (lobby.host_id !== userId) {
            throw new UnauthorizedException('Solo l\'host può avviare il Focus');
        }

        const { data, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .update({
                status: 'FOCUSING',
                started_at: new Date().toISOString()
            })
            .eq('id', lobbyId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return { ...data, password: null };
    }

    async startLobbyBreak(userId: string, lobbyId: string) {
        const { data: lobby } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('host_id')
            .eq('id', lobbyId)
            .single();

        if (!lobby) throw new NotFoundException('Lobby non trovata');
        if (lobby.host_id !== userId) throw new UnauthorizedException('Solo l\'host può avviare la pausa');

        const { data, error } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .update({ 
                status: 'BREAK',
                started_at: new Date().toISOString()
            })
            .eq('id', lobbyId)
            .select() // Return the updated data
            .single();

        if (error) throw new Error(error.message);
        return { ...data, password: null };
    }

    async leaveLobby(userId: string, lobbyId: string, nextHostId?: string) {
        const { data: lobby } = await this.supabase.getClient()
            .from('sanctum_lobbies')
            .select('host_id')
            .eq('id', lobbyId)
            .single();

        if (!lobby) throw new NotFoundException('Lobby non trovata');

        // Solo l'host deve passare il ruolo o distruggere la stanza
        if (lobby.host_id === userId) {
            if (nextHostId) {
                await this.supabase.getClient()
                    .from('sanctum_lobbies')
                    .update({ host_id: nextHostId })
                    .eq('id', lobbyId);
            } else {
                await this.supabase.getClient()
                    .from('sanctum_lobbies')
                    .delete()
                    .eq('id', lobbyId);
            }
        }
        return { success: true };
    }
}
