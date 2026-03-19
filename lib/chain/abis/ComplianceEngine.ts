export const complianceEngineAbi = [
  {
    type: 'function',
    name: 'getOrgComplianceSummary',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [
      { name: 'activeRules', type: 'uint256' },
      { name: 'totalViolations', type: 'uint256' },
      { name: 'overdueDeadlines', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRule',
    inputs: [{ name: 'ruleId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'org', type: 'address' },
          { name: 'setBy', type: 'address' },
          { name: 'ruleType', type: 'uint8' },
          { name: 'label', type: 'string' },
          { name: 'threshold', type: 'uint128' },
          { name: 'currentValue', type: 'uint128' },
          { name: 'startDate', type: 'uint48' },
          { name: 'endDate', type: 'uint48' },
          { name: 'status', type: 'uint8' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRulesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getViolationsForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getViolation',
    inputs: [{ name: 'index', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'ruleId', type: 'bytes32' },
          { name: 'deadlineId', type: 'bytes32' },
          { name: 'org', type: 'address' },
          { name: 'timestamp', type: 'uint48' },
          { name: 'violationType', type: 'string' },
          { name: 'thresholdValue', type: 'uint128' },
          { name: 'actualValue', type: 'uint128' },
          { name: 'evidenceHash', type: 'bytes32' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeadlinesForOrg',
    inputs: [{ name: 'org', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getDeadline',
    inputs: [{ name: 'deadlineId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'org', type: 'address' },
          { name: 'filingType', type: 'string' },
          { name: 'dueDate', type: 'uint48' },
          { name: 'completedDate', type: 'uint48' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  // --- Write functions ---
  {
    type: 'function',
    name: 'createRule',
    inputs: [
      { name: 'ruleId', type: 'bytes32' },
      { name: 'org', type: 'address' },
      { name: 'setBy', type: 'address' },
      { name: 'ruleType', type: 'uint8' },
      { name: 'label', type: 'string' },
      { name: 'threshold', type: 'uint128' },
      { name: 'startDate', type: 'uint48' },
      { name: 'endDate', type: 'uint48' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'reportValue',
    inputs: [
      { name: 'ruleId', type: 'bytes32' },
      { name: 'amount', type: 'uint128' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createDeadline',
    inputs: [
      { name: 'deadlineId', type: 'bytes32' },
      { name: 'org', type: 'address' },
      { name: 'filingType', type: 'string' },
      { name: 'dueDate', type: 'uint48' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // --- Events ---
  {
    type: 'event',
    name: 'RuleCreated',
    inputs: [
      { name: 'ruleId', type: 'bytes32', indexed: true },
      { name: 'org', type: 'address', indexed: true },
      { name: 'ruleType', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ValueReported',
    inputs: [
      { name: 'ruleId', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint128', indexed: false },
      { name: 'newStatus', type: 'uint8', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ViolationRecorded',
    inputs: [
      { name: 'ruleId', type: 'bytes32', indexed: true },
      { name: 'org', type: 'address', indexed: true },
      { name: 'violationIndex', type: 'uint256', indexed: false },
    ],
  },
  // --- Custom Errors ---
  { type: 'error', name: 'RuleAlreadyExists', inputs: [{ name: 'ruleId', type: 'bytes32' }] },
  { type: 'error', name: 'RuleNotFound', inputs: [{ name: 'ruleId', type: 'bytes32' }] },
  { type: 'error', name: 'RuleInactive', inputs: [{ name: 'ruleId', type: 'bytes32' }] },
] as const;
