import { Test, TestingModule } from '@nestjs/testing';
import { SanctumService } from './sanctum.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('SanctumService', () => {
  let service: SanctumService;

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnThis(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanctumService,
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<SanctumService>(SanctumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
