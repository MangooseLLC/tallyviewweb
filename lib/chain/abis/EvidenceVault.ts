export const evidenceVaultAbi = [
  {
    type: 'function',
    name: 'getCaseSummary',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [
      { name: 'evidenceCount', type: 'uint256' },
      { name: 'stage', type: 'uint8' },
      { name: 'isSealed', type: 'bool' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCasesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getCase',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'targetOrg', type: 'address' },
          { name: 'stage', type: 'uint8' },
          { name: 'openedAt', type: 'uint48' },
          { name: 'isSealed', type: 'bool' },
          { name: 'leadInvestigator', type: 'address' },
          { name: 'closedAt', type: 'uint48' },
          { name: 'title', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEvidence',
    inputs: [{ name: 'evidenceIndex', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'caseId', type: 'bytes32' },
          { name: 'submitter', type: 'address' },
          { name: 'classification', type: 'uint8' },
          { name: 'submittedAt', type: 'uint48' },
          { name: 'sealStatus', type: 'uint8' },
          { name: 'description', type: 'string' },
          { name: 'contentHash', type: 'bytes32' },
          { name: 'relatedAnomalyId', type: 'bytes32' },
          { name: 'relatedEntityId', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEvidenceForCase',
    inputs: [{ name: 'caseId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getEvidenceCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isCaseAuthorized',
    inputs: [
      { name: 'caseId', type: 'bytes32' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
] as const;
