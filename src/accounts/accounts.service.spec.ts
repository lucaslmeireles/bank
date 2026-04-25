import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from './accounts.service';
import { DrizzleService } from '../drizzle/drizzle.service';
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

const makeAccount = (overrides = {}) => ({
  id: 'uuid-conta-alice',
  owner: 'uuid-alice',
  balance: 15.42,
  number: 1549862,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const accounts = [
  {
    id: 'uuid-conta-alice',
    owner: 'uuid-alice',
    balance: 15.42,
    number: 1549862,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'uuid-conta-bob',
    owner: 'uuid-bob',
    balance: 0.25,
    number: 1549863,
    createdAt: new Date('2024-01-01'),
  },
];

const makeCreateDto = (overrides = {}) => ({
  owner: 'uuid-alice',
  balance: 15.42,
  number: 1549862,
  ...overrides,
});

const makeCreateDtoWrong = (overrides = {}) => ({
  owner: '4',
  balance: 15.42987654218,
  number: 154986288888888888888,
  ...overrides,
});

describe('AccountsService', () => {
  let service: AccountsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: DrizzleService,
          useValue: { db: mockDb },
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create an account', async () => {
      const account = makeAccount();
      mockQuery.returning.mockResolvedValueOnce([account]);

      const [result] = await service.create(makeCreateDto());
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBe(account);
    });
    it('should not be created an account with wrong parameters', async () => {
      mockQuery.returning.mockResolvedValueOnce(null);

      const result = await service.create(makeCreateDtoWrong());
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBe(null);
    });
  });
  describe('findAll', () => {
    it('should find all accounts', async () => {
      mockQuery.from.mockResolvedValueOnce(accounts);

      const result = await service.findAll();
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(accounts);
    });
  });
  describe('findById', () => {
    it('should find account with id', async () => {
      const account = makeAccount();
      mockQuery.where.mockResolvedValueOnce([account]);

      const result = await service.findOne(account.id);
      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toBe(account);
    });

    it('should not return, if uuid not provided', async () => {
      mockQuery.where.mockResolvedValueOnce([]);
      const result = await service.findOne('not-an-uuid');
      expect(result).toBeUndefined();
    });
  });
  describe('Remove', () => {
    it('should remove account', async () => {
      const account = makeAccount();
      mockQuery.where.mockResolvedValueOnce(null);
      const result = await service.remove(account.id);
      expect(result).toBe(null);
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
