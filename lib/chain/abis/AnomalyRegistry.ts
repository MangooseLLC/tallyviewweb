export const anomalyRegistryAbi = [
  {
    type: 'function',
    name: 'getOrgAnomalySummary',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [
      { name: 'total', type: 'uint256' },
      { name: 'open', type: 'uint256' },
      { name: 'critical', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAnomaliesByStatus',
    inputs: [
      { name: 'org', type: 'address' },
      { name: 'status', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAnomaly',
    inputs: [{ name: 'anomalyIndex', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'org', type: 'address' },
          { name: 'severity', type: 'uint8' },
          { name: 'category', type: 'uint8' },
          { name: 'confidenceBps', type: 'uint16' },
          { name: 'detectedAt', type: 'uint48' },
          { name: 'status', type: 'uint8' },
          { name: 'title', type: 'string' },
          { name: 'evidenceHash', type: 'bytes32' },
          { name: 'relatedRuleId', type: 'bytes32' },
          { name: 'reviewedBy', type: 'address' },
          { name: 'reviewedAt', type: 'uint48' },
          { name: 'reviewNoteHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAnomaliesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAnomalyCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  // --- Write functions ---
  {
    type: 'function',
    name: 'recordAnomaly',
    inputs: [
      { name: 'org', type: 'address' },
      { name: 'severity', type: 'uint8' },
      { name: 'category', type: 'uint8' },
      { name: 'title', type: 'string' },
      { name: 'confidenceBps', type: 'uint16' },
      { name: 'evidenceHash', type: 'bytes32' },
      { name: 'relatedRuleId', type: 'bytes32' },
    ],
    outputs: [{ name: 'anomalyIndex', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  // --- Events ---
  {
    type: 'event',
    name: 'AnomalyRecorded',
    inputs: [
      { name: 'org', type: 'address', indexed: true },
      { name: 'anomalyIndex', type: 'uint256', indexed: false },
      { name: 'severity', type: 'uint8', indexed: false },
      { name: 'category', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AnomalyStatusChanged',
    inputs: [
      { name: 'anomalyIndex', type: 'uint256', indexed: true },
      { name: 'newStatus', type: 'uint8', indexed: false },
      { name: 'reviewer', type: 'address', indexed: false },
    ],
  },
  // --- Custom Errors ---
  { type: 'error', name: 'AnomalyNotFound', inputs: [{ name: 'anomalyIndex', type: 'uint256' }] },
  { type: 'error', name: 'InvalidSeverity', inputs: [{ name: 'severity', type: 'uint8' }] },
  { type: 'error', name: 'OrgNotProvisioned', inputs: [{ name: 'org', type: 'address' }] },
] as const;
