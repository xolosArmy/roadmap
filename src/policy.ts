/** Public-only policy. Never add the private roster, source IDs or operational prose here. */
export const CONTRACT_VERSION = 'xolosarmy-public-roadmap/1.0.0';
export const CATALOG_VERSION = '2026-09-20.1';
export const MAX_SNAPSHOT_BYTES = 64 * 1024;
export const DONATION_ADDRESS = 'ecash:qq7qn90ev23ecastqmn8as00u8mcp4tzsspvt5dtlk';
export const SOURCE_FIELDS = Object.freeze([
  'Project', 'Roadmap Phase', 'Priority', 'Status', 'Security Status', 'Last Update',
] as const);

export const CATALOG = Object.freeze([
  { id: 'ecash-magazine', source: 'ecash-magazine', name: 'eCash Magazine' },
  { id: 'ecash-mexico', source: 'ecash-mexico', name: 'eCash México' },
  { id: 'tonalli-contracts', source: 'tonalli-core', name: 'Tonalli Contracts' },
  { id: 'tonalli-memo', source: 'tonalli-memo', name: 'Tonalli Memo' },
  { id: 'tonalli-wallet', source: 'RMZWallet / Tonalli Wallet', name: 'Tonalli Wallet' },
  { id: 'tonalli-website', source: 'tonalli-landing', name: 'Tonalli Website' },
  { id: 'x402-xec', source: 'x402-XEC', name: 'x402-XEC' },
  { id: 'xolos-ramirez', source: 'xolosramirez', name: 'Xolos Ramírez' },
].map(entry => Object.freeze(entry)));

export const PHASES = Object.freeze(['0/Core', 'A', 'B', 'C', 'D', 'E', 'F', 'Long-term', 'Ops']);
export const PRIORITIES = Object.freeze(['P0', 'P1', 'P2', 'P3']);
export const STATUSES = Object.freeze([
  'ACTIVE', 'BLOCKED', 'REVIEW', 'FROZEN', 'COMPLETE', 'PLANNED',
  'MAINTENANCE', 'RESEARCH', 'PRE-ENGINEERING', 'WAITING',
]);
export const SECURITY_MAP = Object.freeze({
  PASS: 'REPORTED_PASS', CONDITIONAL: 'CONDITIONAL', BLOCKED: 'BLOCKED',
  PENDING: 'PENDING', NOT_ASSESSED: 'NOT_ASSESSED', 'N/A': 'NOT_REPORTED',
} as const);
export const SECURITY_STATUSES = Object.freeze(Object.values(SECURITY_MAP));
export const SECURITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  REPORTED_PASS: 'Reported gate passed', CONDITIONAL: 'Conditions remain',
  BLOCKED: 'Gate blocked', PENDING: 'Assessment pending',
  NOT_ASSESSED: 'Not assessed', NOT_REPORTED: 'No assessment reported',
});

export interface PublicProject {
  id: string; name: string; phase: string; priority: string; status: string;
  securityStatus: string; lastUpdate: string;
}
export interface Snapshot {
  contractVersion: string; catalogVersion: string; generatedAt: string;
  observedAt: string; snapshotId: string; projects: PublicProject[];
}
export type UnsignedSnapshot = Omit<Snapshot, 'snapshotId'>;

const timestamp = { type: 'string', pattern: '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' };
export const SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://xolosarmy.xyz/roadmap/schema.json',
  title: 'xolosArmy Public Roadmap Contract 1.0.0',
  type: 'object', additionalProperties: false,
  required: ['contractVersion', 'catalogVersion', 'generatedAt', 'observedAt', 'snapshotId', 'projects'],
  properties: {
    contractVersion: { const: CONTRACT_VERSION }, catalogVersion: { const: CATALOG_VERSION },
    generatedAt: timestamp, observedAt: timestamp,
    snapshotId: { type: 'string', pattern: '^[a-f0-9]{64}$' },
    projects: {
      type: 'array', minItems: CATALOG.length, maxItems: CATALOG.length,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'name', 'phase', 'priority', 'status', 'securityStatus', 'lastUpdate'],
        properties: {
          id: { type: 'string', enum: CATALOG.map(p => p.id) },
          name: { type: 'string', enum: CATALOG.map(p => p.name) },
          phase: { type: 'string', enum: PHASES }, priority: { type: 'string', enum: PRIORITIES },
          status: { type: 'string', enum: STATUSES },
          securityStatus: { type: 'string', enum: SECURITY_STATUSES }, lastUpdate: timestamp,
        },
      },
    },
  },
};
