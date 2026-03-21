import { Test, TestingModule } from '@nestjs/testing';
import { SanctumController } from './sanctum.controller';

describe('SanctumController', () => {
  let controller: SanctumController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SanctumController],
    }).compile();

    controller = module.get<SanctumController>(SanctumController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
