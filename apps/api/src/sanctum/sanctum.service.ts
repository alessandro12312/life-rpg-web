import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateLobbyDto } from './dto/create-lobby.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SanctumService {
  constructor(private readonly supabase: SupabaseService) {}

  async createLobby(userId: string, dto: CreateLobbyDto) {
    let hashedPassword: string | null = null;
    if (dto.isPrivate && dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .insert([
        {
          title: dto.title,
          category: dto.category,
          max_participants: dto.maxParticipants,
          is_private: dto.isPrivate,
          password: hashedPassword,
          focus_duration: dto.focusDuration,
          break_duration: dto.breakDuration,
          host_id: userId,
          status: 'WAITING',
        },
      ])
      .select()
      .single();

    if (error)
      throw new InternalServerErrorException(
        'Errore nella creazione della lobby',
      );
    return { ...data, password: null };
  }

  async getActiveLobbies() {
    const { data, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('*, host:users!host_id(username, avatar_id, race, class_name)')
      .in('status', ['WAITING', 'FOCUSING'])
      .order('created_at', { ascending: false });

    if (error)
      throw new InternalServerErrorException('Errore nel recupero delle lobby');
    // Strip out passwords
    return data.map((lobby) => ({ ...lobby, password: null }));
  }

  async getLobby(lobbyId: string) {
    const { data: lobby, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('*, host:users!host_id(username, avatar_id, race, class_name)')
      .eq('id', lobbyId)
      .single();

    if (error || !lobby) throw new NotFoundException('Lobby non trovata');
    return { ...lobby, password: null };
  }

  async joinLobby(userId: string, lobbyId: string, password?: string) {
    const { data: lobby, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('*')
      .eq('id', lobbyId)
      .single();

    if (error || !lobby) throw new NotFoundException('Lobby non trovata');

    if (lobby.is_private && lobby.password) {
      const match = await bcrypt.compare(password || '', lobby.password);
      if (!match) throw new UnauthorizedException('Password errata');
    }

    return { ...lobby, password: null };
  }

  async startLobbyTimer(userId: string, lobbyId: string) {
    const { data: lobby, error: lobbyError } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('host_id')
      .eq('id', lobbyId)
      .single();

    if (lobbyError || !lobby) throw new NotFoundException('Lobby non trovata');

    if (lobby.host_id !== userId) {
      throw new UnauthorizedException("Solo l'host può avviare il Focus");
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .update({
        status: 'FOCUSING',
        started_at: new Date().toISOString(),
      })
      .eq('id', lobbyId)
      .select()
      .single();

    if (error)
      throw new InternalServerErrorException("Errore nell'avvio del timer");
    return { ...data, password: null };
  }

  async startLobbyBreak(userId: string, lobbyId: string) {
    const { data: lobby } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('host_id')
      .eq('id', lobbyId)
      .single();

    if (!lobby) throw new NotFoundException('Lobby non trovata');
    if (lobby.host_id !== userId)
      throw new UnauthorizedException("Solo l'host può avviare la pausa");

    const { data, error } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .update({
        status: 'BREAK',
        started_at: new Date().toISOString(),
      })
      .eq('id', lobbyId)
      .select() // Return the updated data
      .single();

    if (error)
      throw new InternalServerErrorException("Errore nell'avvio della pausa");
    return { ...data, password: null };
  }

  async leaveLobby(userId: string, lobbyId: string, nextHostId?: string) {
    const { data: lobby } = await this.supabase
      .getClient()
      .from('sanctum_lobbies')
      .select('host_id')
      .eq('id', lobbyId)
      .single();

    if (!lobby) throw new NotFoundException('Lobby non trovata');

    // Solo l'host deve passare il ruolo o distruggere la stanza
    if (lobby.host_id === userId) {
      if (nextHostId) {
        // Validazione: verificare che nextHostId sia un utente reale
        const { data: targetUser } = await this.supabase
          .getClient()
          .from('users')
          .select('id')
          .eq('id', nextHostId)
          .single();
        if (!targetUser) {
          throw new BadRequestException(
            "L'utente specificato come nuovo host non esiste",
          );
        }

        await this.supabase
          .getClient()
          .from('sanctum_lobbies')
          .update({ host_id: nextHostId })
          .eq('id', lobbyId);
      } else {
        await this.supabase
          .getClient()
          .from('sanctum_lobbies')
          .delete()
          .eq('id', lobbyId);
      }
    }
    return { success: true };
  }
}
