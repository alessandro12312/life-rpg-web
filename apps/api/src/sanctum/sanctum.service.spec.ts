import { Test, TestingModule } from '@nestjs/testing';
import { SanctumService } from './sanctum.service';

describe('SanctumService', () => {
  let service: SanctumService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SanctumService],
    }).compile();

    service = module.get<SanctumService>(SanctumService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
