import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DrizzleService } from '../drizzle/drizzle.service';
import * as schema from '../drizzle/schema';
const mockQuery = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  execute: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockQuery),
  insert: jest.fn().mockReturnValue(mockQuery),
  delete: jest.fn().mockReturnValue(mockQuery),
};

const makeUser = (overrides = {}) => ({
  id: 'uuid-alice',
  email: 'alice@email.com',
  passwordHash: '$2b$12$hashedpassword',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const makeCreateDto = (overrides = {}) => ({
  email: 'alice@email.com',
  password: 'senha123',
  ...overrides,
});
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DrizzleService,
          useValue: { db: mockDb },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create user and return without password', async () => {
      const user = makeUser();
      mockQuery.returning.mockResolvedValueOnce([{ email: user.email }]);

      const [result] = await service.create(makeCreateDto());
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.email).toBe(user.email);
      expect(mockQuery.returning).toHaveBeenCalledWith({
        email: schema.users.email,
      });
    });

    it('should throw error if email already exists ', async () => {
      mockQuery.returning.mockRejectedValueOnce(
        new Error('duplicate key value violates unique constraint'),
      );

      await expect(service.create(makeCreateDto())).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return user by id ', async () => {
      const user = makeUser();
      mockQuery.where.mockResolvedValueOnce([user]);

      const result = await service.findOne('uuid-alice');

      expect(result).toEqual(user);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should return undefined if not found', async () => {
      mockQuery.where.mockResolvedValueOnce([]);

      const result = await service.findOne('uuid-inexistente');

      expect(result).toBeUndefined();
    });
  });

  describe('findByEmail', () => {
    it(' should return user by email', async () => {
      const user = makeUser();
      mockQuery.where.mockResolvedValueOnce([user]);

      const result = await service.findByEmail('alice@email.com');

      expect(result).toEqual(user);
    });

    it('should return undefined if email does not exists', async () => {
      mockQuery.where.mockResolvedValueOnce([]);

      const result = await service.findByEmail('naoexiste@email.com');

      expect(result).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      mockQuery.where.mockResolvedValueOnce({ rowCount: 1 });

      await service.remove('uuid-alice');

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
});
