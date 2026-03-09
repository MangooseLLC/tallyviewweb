export const auditLedgerAbi = [
  {
    type: 'function',
    name: 'getLatestAudit',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [
      { name: 'year', type: 'uint16' },
      { name: 'month', type: 'uint8' },
      {
        name: 'entry',
        type: 'tuple',
        components: [
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'schemaHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint48' },
          { name: 'submitter', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'nameOf',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrganization',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'einHash', type: 'bytes32' },
          { name: 'registeredAt', type: 'uint48' },
          { name: 'latestYear', type: 'uint16' },
          { name: 'latestMonth', type: 'uint8' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isOrganizationRegistered',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSubmissionCount',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAudit',
    inputs: [
      { name: 'org', type: 'address' },
      { name: 'year', type: 'uint16' },
      { name: 'month', type: 'uint8' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'merkleRoot', type: 'bytes32' },
          { name: 'schemaHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint48' },
          { name: 'submitter', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasAuditForPeriod',
    inputs: [
      { name: 'org', type: 'address' },
      { name: 'year', type: 'uint16' },
      { name: 'month', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;
