import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { DrizzleService } from '../drizzle/drizzle.service';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockTx = {
  insert: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  for: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  rollback: jest.fn(),
};

const mockQuery = {
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  returning: jest.fn(),
  execute: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnValue(mockQuery),
  insert: jest.fn().mockReturnValue(mockQuery),
  delete: jest.fn().mockReturnValue(mockQuery),
  transaction: jest.fn().mockImplementation((cb) => cb(mockTx)),
};

const makeTransaction = (overrides = {}) => ({
  id: 'uuid',
  to: 'uuid-alice',
  from: 'uuid-bob',
  amount: 15.42,
  status: 'success',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const transactions = [
  {
    id: 'uuid',
    to: {
      id: 'uuid-alice',
      number: 45623,
      balance: '45.21',
    },
    from: {
      id: 'uuid-bob',
      number: 45624,
      balance: '45.21',
    },
    amount: 15.42,
    status: 'success',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'uuid',
    to: {
      id: 'uuid-bob',
      number: 45624,
      balance: '45.21',
    },
    from: {
      id: 'uuid-alice',
      number: 45623,
      balance: '45.21',
    },
    amount: 15.78,
    status: 'pendent',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'uuid',
    to: {
      id: 'uuid-clara',
      number: 45625,
      balance: '45.21',
    },
    from: {
      id: 'uuid-bob',
      number: 45624,
      balance: '45.21',
    },
    amount: 45.21,
    status: 'rollback',
    createdAt: new Date('2024-01-01'),
  },
];

const makeTransactionRollBack = (overrides = {}) => ({
  id: 'uuid',
  to: 'uuid-alice',
  from: 'uuid-bob',
  amount: 15.42,
  status: 'rolback',
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

const makeCreateDto = (overrides = {}) => ({
  to: 'uuid-alice',
  from: 'uuid-bob',
  amount: '15.42',
  ...overrides,
});

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: DrizzleService,
          useValue: { db: mockDb },
        },
        {
          provide: 'BullQueue_transactions',
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });
  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create an transaction sync', async () => {
      const transaction = makeTransaction();
      mockTx.returning
        .mockResolvedValueOnce([transaction]) // insert da transaction
        .mockResolvedValueOnce([transaction]); // update do status no final

      mockTx.for
        .mockResolvedValueOnce([{ balance: '100.00' }]) // select from
        .mockResolvedValueOnce([{ balance: '200.00' }]); // select to

      const result = await service.create(makeCreateDto());

      expect(result).toEqual(transaction);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
    it('should create an transaction queue', async () => {
      const transaction = makeTransaction();
      mockQuery.returning.mockResolvedValueOnce([transaction]);

      const result = await service.createWithQueue(makeCreateDto());

      expect(result).toEqual(transaction);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'process',
        { transactionId: transaction.id },
        expect.objectContaining({ attempts: 3 }),
      );
    });
  });
  describe('findAll', () => {
    it('should return all transactions', async () => {
      mockQuery.innerJoin
        .mockReturnValueOnce(mockQuery)
        .mockResolvedValueOnce(transactions);

      const result = await service.findAll();
      expect(result).toBe(transactions);
      expect(mockQuery.innerJoin).toHaveBeenCalledTimes(2);
    });
  });
  describe('findOne', () => {
    it('should return one transaction by id', async () => {
      const transaction = makeTransaction();
      mockQuery.where.mockResolvedValueOnce([transaction]);

      const result = await service.findOne(transaction.id);
      expect(result).toBe(transaction);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
  describe('remove', () => {
    it('should remove a transaction', async () => {
      await service.remove('uuid-transaction');
      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
