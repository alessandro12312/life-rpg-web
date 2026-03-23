import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    private supabase;

    constructor(private configService: ConfigService) {
        const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('FATAL: SUPABASE_URL e SUPABASE_ANON_KEY devono essere configurate nelle variabili d\'ambiente.');
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('Missing Authorization Header');
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            throw new UnauthorizedException('Invalid Token Format');
        }

        // Validate token with Supabase Auth
        const { data, error } = await this.supabase.auth.getUser(token);

        if (error || !data?.user) {
             throw new UnauthorizedException('Invalid Token or User not found');
        }

        // Attach user info to request for the controllers
        request.user = data.user;
        
        return true;
    }
}
