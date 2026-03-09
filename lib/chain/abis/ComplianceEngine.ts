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
] as const;
