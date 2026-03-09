export const entityGraphAbi = [
  {
    type: 'function',
    name: 'getSharedEntities',
    inputs: [
      { name: 'orgA', type: 'address' },
      { name: 'orgB', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEntity',
    inputs: [{ name: 'entityId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'entityType', type: 'uint8' },
          { name: 'createdAt', type: 'uint48' },
          { name: 'active', type: 'bool' },
          { name: 'identityHash', type: 'bytes32' },
          { name: 'label', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrgGraphSummary',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [
      { name: 'totalEdges', type: 'uint256' },
      { name: 'activeEdges', type: 'uint256' },
      { name: 'uniqueEntities', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEntitiesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEdgesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEdge',
    inputs: [{ name: 'edgeId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'entityId', type: 'bytes32' },
          { name: 'org', type: 'address' },
          { name: 'relationshipType', type: 'uint8' },
          { name: 'status', type: 'uint8' },
          { name: 'startDate', type: 'uint48' },
          { name: 'endDate', type: 'uint48' },
          { name: 'evidenceHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOrgsForEntity',
    inputs: [{ name: 'entityId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
  },
] as const;
