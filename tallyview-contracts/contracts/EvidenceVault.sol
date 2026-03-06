// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {TallyviewTypes} from "./libraries/TallyviewTypes.sol";
import {IAuditLedger} from "./interfaces/IAuditLedger.sol";
import {IEvidenceVault} from "./interfaces/IEvidenceVault.sol";

/// @title EvidenceVault
/// @author Tallyview
/// @notice Investigation evidence contract for the Tallyview Avalanche L1.
///
///         Anchors investigation evidence onchain with chain-of-custody metadata,
///         creating cryptographically verifiable records that prove what evidence
///         existed at what time, who submitted it, and how it was classified.
///         Evidence is immutable once submitted — the hash, timestamp, submitter,
///         and classification are permanent. This immutability is what makes the
///         evidence chain admissible-grade for FCA litigation.
///
///         Supports the full investigation pipeline:
///           Tip → Analysis → Discovery → Filing → Recovery → Closed
///
///         Cases can be sealed by regulators to restrict evidence access.
///         Investigators are granted per-case access on a need-to-know basis.
///         Closing and sealing are independent lifecycle events.
///
///         REGULATOR_ROLE is unique to this contract. Regulators can seal
///         cases/evidence and authorize/revoke investigators, but cannot create
///         or close cases and cannot submit evidence directly. If a regulator
///         needs to submit evidence, they authorize themselves for the case first.
/// @dev UUPS upgradeable. Deployed behind an ERC1967 proxy.
///      References IAuditLedger for org validation on case creation — the target
///      org must be registered but does NOT need to be active (you investigate
///      deactivated orgs). Does NOT import IAnomalyRegistry or IEntityGraph —
///      cross-contract references are soft bytes32 breadcrumbs decoded by the
///      SaaS layer.
contract EvidenceVault is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IEvidenceVault
{
    // -------------------------------------------------------------------------
    //  Roles
    // -------------------------------------------------------------------------

    /// @notice Platform administrators. Can create/close cases, seal, authorize
    ///         investigators, submit evidence, and authorize upgrades.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Granted to the Tallyview relay service. Can create cases, advance
    ///         stages, authorize investigators, and submit evidence (including
    ///         whistleblower tips on behalf of anonymous submitters).
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");

    /// @notice State AG staff, federal investigators, or oversight officials.
    ///         Can seal cases/evidence and authorize/revoke investigators.
    ///         Cannot create or close cases. Cannot submit evidence directly —
    ///         they work through authorized investigators.
    bytes32 public constant REGULATOR_ROLE = keccak256("REGULATOR_ROLE");

    // -------------------------------------------------------------------------
    //  Constants
    // -------------------------------------------------------------------------

    /// @notice Maximum byte length for case titles and evidence descriptions.
    uint256 public constant MAX_DESCRIPTION_LENGTH = 200;

    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    /// @notice Reference to the AuditLedger contract for org validation.
    ///         Set once in initialize; follows proxy upgrades automatically.
    IAuditLedger public auditLedger;

    /// @dev Cases keyed by caller-provided caseId.
    ///      A stored openedAt of 0 means the case does not exist.
    mapping(bytes32 => TallyviewTypes.Case) private _cases;

    /// @dev Case IDs per organization for enumeration.
    mapping(address => bytes32[]) private _orgCases;

    /// @dev Per-case investigator authorization. True means the address can
    ///      submit evidence to this case.
    mapping(bytes32 => mapping(address => bool)) private _caseAuthorized;

    /// @dev Flat array of all evidence entries. The array index IS the unique
    ///      ID — monotonic counter guarantees uniqueness even within the same block.
    TallyviewTypes.EvidenceEntry[] private _evidence;

    /// @dev Evidence indices per case for enumeration.
    mapping(bytes32 => uint256[]) private _caseEvidence;

    /// @dev Reserved storage for future upgrades.
    uint256[50] private __gap;

    // -------------------------------------------------------------------------
    //  Initialization
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract. Called once through the proxy.
    ///         Grants the deployer DEFAULT_ADMIN_ROLE and ADMIN_ROLE, and stores
    ///         the IAuditLedger reference used for org validation on case creation.
    /// @param auditLedgerAddress The deployed AuditLedger proxy address.
    function initialize(address auditLedgerAddress) external initializer {
        if (auditLedgerAddress == address(0)) revert ZeroAddress();

        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        auditLedger = IAuditLedger(auditLedgerAddress);
    }

    // -------------------------------------------------------------------------
    //  Case Management
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    /// @dev Validates the target org is registered in AuditLedger. Does NOT check
    ///      isOrganizationActive — investigating deactivated orgs is valid.
    ///      The lead investigator is automatically added to the per-case
    ///      authorization mapping on creation.
    function createCase(
        bytes32 caseId,
        address targetOrg,
        string calldata title,
        address leadInvestigator
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
        ) revert Unauthorized();

        if (!auditLedger.isOrganizationRegistered(targetOrg)) {
            revert OrgNotRegistered();
        }
        if (_cases[caseId].openedAt > 0) revert CaseAlreadyExists();
        if (bytes(title).length == 0) revert EmptyDescription();
        if (bytes(title).length > MAX_DESCRIPTION_LENGTH) {
            revert DescriptionTooLong();
        }
        if (leadInvestigator == address(0)) revert ZeroAddress();

        _cases[caseId] = TallyviewTypes.Case({
            targetOrg: targetOrg,
            stage: TallyviewTypes.InvestigationStage.Tip,
            openedAt: uint48(block.timestamp),
            isSealed: false,
            leadInvestigator: leadInvestigator,
            closedAt: 0,
            title: title
        });

        _caseAuthorized[caseId][leadInvestigator] = true;
        _orgCases[targetOrg].push(caseId);

        emit CaseCreated(caseId, targetOrg, leadInvestigator);
    }

    /// @inheritdoc IEvidenceVault
    /// @dev Forward-only stage progression. The Closed stage is deliberately
    ///      excluded — use closeCase() instead. This preserves the admin-only
    ///      closure gate. Stage skipping is allowed (e.g., Tip → Discovery)
    ///      because intermediate analysis may happen offchain.
    function updateCaseStage(
        bytes32 caseId,
        TallyviewTypes.InvestigationStage newStage
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
        ) revert Unauthorized();

        TallyviewTypes.Case storage c = _cases[caseId];
        if (c.openedAt == 0) revert CaseNotFound();
        if (c.closedAt > 0) revert CaseIsClosed();
        if (
            uint8(newStage) <= uint8(c.stage)
                || newStage == TallyviewTypes.InvestigationStage.Closed
        ) revert InvalidStageTransition();

        TallyviewTypes.InvestigationStage oldStage = c.stage;
        c.stage = newStage;

        emit CaseStageChanged(caseId, oldStage, newStage);
    }

    /// @inheritdoc IEvidenceVault
    /// @dev Sealing is forward-only — once sealed, cannot be unsealed. All
    ///      existing evidence entries for the case are set to SealStatus.Sealed
    ///      (entries already sealed are skipped). New evidence submitted after
    ///      sealing automatically inherits Sealed status via submitEvidence.
    function sealCase(bytes32 caseId) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(REGULATOR_ROLE, msg.sender)
        ) revert Unauthorized();

        TallyviewTypes.Case storage c = _cases[caseId];
        if (c.openedAt == 0) revert CaseNotFound();
        if (c.isSealed) revert CaseAlreadySealed();

        c.isSealed = true;

        uint256[] storage indices = _caseEvidence[caseId];
        uint256 len = indices.length;
        for (uint256 i; i < len; ) {
            TallyviewTypes.EvidenceEntry storage e = _evidence[indices[i]];
            if (e.sealStatus == TallyviewTypes.SealStatus.Unsealed) {
                e.sealStatus = TallyviewTypes.SealStatus.Sealed;
            }
            unchecked { ++i; }
        }

        emit CaseSealed(caseId, msg.sender);
    }

    /// @inheritdoc IEvidenceVault
    /// @dev Only ADMIN_ROLE can close — this is the exclusive path to the Closed
    ///      stage. Emits both CaseClosed and CaseStageChanged to maintain a
    ///      complete stage-transition event trail.
    function closeCase(bytes32 caseId) external onlyRole(ADMIN_ROLE) {
        TallyviewTypes.Case storage c = _cases[caseId];
        if (c.openedAt == 0) revert CaseNotFound();
        if (c.closedAt > 0) revert CaseIsClosed();

        c.closedAt = uint48(block.timestamp);

        TallyviewTypes.InvestigationStage oldStage = c.stage;
        c.stage = TallyviewTypes.InvestigationStage.Closed;

        emit CaseClosed(caseId);
        emit CaseStageChanged(
            caseId,
            oldStage,
            TallyviewTypes.InvestigationStage.Closed
        );
    }

    /// @inheritdoc IEvidenceVault
    function authorizeInvestigator(
        bytes32 caseId,
        address investigator
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(SYSTEM_ROLE, msg.sender)
                && !hasRole(REGULATOR_ROLE, msg.sender)
        ) revert Unauthorized();

        if (_cases[caseId].openedAt == 0) revert CaseNotFound();
        if (investigator == address(0)) revert ZeroAddress();

        _caseAuthorized[caseId][investigator] = true;

        emit InvestigatorAuthorized(caseId, investigator);
    }

    /// @inheritdoc IEvidenceVault
    function revokeInvestigator(
        bytes32 caseId,
        address investigator
    ) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(REGULATOR_ROLE, msg.sender)
        ) revert Unauthorized();

        if (_cases[caseId].openedAt == 0) revert CaseNotFound();
        if (investigator == _cases[caseId].leadInvestigator) {
            revert CannotRevokeLead();
        }

        _caseAuthorized[caseId][investigator] = false;

        emit InvestigatorRevoked(caseId, investigator);
    }

    // -------------------------------------------------------------------------
    //  Evidence Submission
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    /// @dev Evidence is immutable once pushed to the array — no fields are ever
    ///      modified after creation except sealStatus (forward-only to Sealed).
    ///
    ///      When classification is Tip, the relay submits on behalf of an
    ///      anonymous whistleblower. Only the relay address appears onchain as
    ///      submitter. The transaction hash serves as the whistleblower's receipt
    ///      proving temporal priority — critical for qui tam standing.
    ///
    ///      If the case is sealed, new evidence automatically inherits
    ///      SealStatus.Sealed so it cannot be viewed outside the authorized set.
    function submitEvidence(
        bytes32 caseId,
        TallyviewTypes.EvidenceClassification classification,
        string calldata description,
        bytes32 contentHash,
        bytes32 relatedAnomalyId,
        bytes32 relatedEntityId
    ) external returns (uint256 evidenceIndex) {
        TallyviewTypes.Case storage c = _cases[caseId];
        if (c.openedAt == 0) revert CaseNotFound();
        if (c.closedAt > 0) revert CaseIsClosed();
        if (!_isCaseAuthorized(caseId, msg.sender)) revert NotCaseAuthorized();
        if (bytes(description).length == 0) revert EmptyDescription();
        if (bytes(description).length > MAX_DESCRIPTION_LENGTH) {
            revert DescriptionTooLong();
        }
        if (contentHash == bytes32(0)) revert ZeroContentHash();

        TallyviewTypes.SealStatus sealStatus = c.isSealed
            ? TallyviewTypes.SealStatus.Sealed
            : TallyviewTypes.SealStatus.Unsealed;

        _evidence.push(
            TallyviewTypes.EvidenceEntry({
                caseId: caseId,
                submitter: msg.sender,
                classification: classification,
                submittedAt: uint48(block.timestamp),
                sealStatus: sealStatus,
                description: description,
                contentHash: contentHash,
                relatedAnomalyId: relatedAnomalyId,
                relatedEntityId: relatedEntityId
            })
        );

        evidenceIndex = _evidence.length - 1;
        _caseEvidence[caseId].push(evidenceIndex);

        emit EvidenceSubmitted(evidenceIndex, caseId, msg.sender, classification);
    }

    /// @inheritdoc IEvidenceVault
    function sealEvidence(uint256 evidenceIndex) external {
        if (
            !hasRole(ADMIN_ROLE, msg.sender)
                && !hasRole(REGULATOR_ROLE, msg.sender)
        ) revert Unauthorized();

        if (evidenceIndex >= _evidence.length) revert EvidenceNotFound();

        TallyviewTypes.EvidenceEntry storage e = _evidence[evidenceIndex];
        if (e.sealStatus == TallyviewTypes.SealStatus.Sealed) {
            revert EvidenceAlreadySealed();
        }

        e.sealStatus = TallyviewTypes.SealStatus.Sealed;

        emit EvidenceSealed(evidenceIndex, e.caseId, msg.sender);
    }

    // -------------------------------------------------------------------------
    //  Queries — Cases
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    function getCase(
        bytes32 caseId
    ) external view returns (TallyviewTypes.Case memory) {
        if (_cases[caseId].openedAt == 0) revert CaseNotFound();
        return _cases[caseId];
    }

    /// @inheritdoc IEvidenceVault
    function getCasesForOrg(
        address org
    ) external view returns (bytes32[] memory) {
        return _orgCases[org];
    }

    // -------------------------------------------------------------------------
    //  Queries — Evidence
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    function getEvidence(
        uint256 evidenceIndex
    ) external view returns (TallyviewTypes.EvidenceEntry memory) {
        if (evidenceIndex >= _evidence.length) revert EvidenceNotFound();
        return _evidence[evidenceIndex];
    }

    /// @inheritdoc IEvidenceVault
    function getEvidenceCount() external view returns (uint256) {
        return _evidence.length;
    }

    /// @inheritdoc IEvidenceVault
    function getEvidenceForCase(
        bytes32 caseId
    ) external view returns (uint256[] memory) {
        return _caseEvidence[caseId];
    }

    // -------------------------------------------------------------------------
    //  Queries — Access Control
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    function isCaseAuthorized(
        bytes32 caseId,
        address account
    ) external view returns (bool) {
        return _isCaseAuthorized(caseId, account);
    }

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @inheritdoc IEvidenceVault
    function getCaseSummary(
        bytes32 caseId
    )
        external
        view
        returns (
            uint256 evidenceCount,
            TallyviewTypes.InvestigationStage stage,
            bool isSealed
        )
    {
        if (_cases[caseId].openedAt == 0) revert CaseNotFound();
        evidenceCount = _caseEvidence[caseId].length;
        stage = _cases[caseId].stage;
        isSealed = _cases[caseId].isSealed;
    }

    // -------------------------------------------------------------------------
    //  UUPS
    // -------------------------------------------------------------------------

    /// @dev Only ADMIN_ROLE can authorize upgrades.
    function _authorizeUpgrade(
        address
    ) internal override onlyRole(ADMIN_ROLE) {}

    // -------------------------------------------------------------------------
    //  Internal Helpers
    // -------------------------------------------------------------------------

    /// @dev Check whether an address is authorized to submit evidence to a case.
    ///      Four authorization paths (any one is sufficient):
    ///        1. Per-case authorization mapping (set via authorizeInvestigator)
    ///        2. Lead investigator for the case
    ///        3. Caller has ADMIN_ROLE
    ///        4. Caller has SYSTEM_ROLE
    ///
    ///      REGULATOR_ROLE is deliberately excluded from evidence submission.
    ///      Regulators seal cases/evidence and authorize/revoke investigators,
    ///      but do not submit evidence directly. If a regulator needs to submit,
    ///      they authorize themselves for the case first — this creates an
    ///      explicit audit trail of the self-authorization.
    function _isCaseAuthorized(
        bytes32 caseId,
        address caller
    ) internal view returns (bool) {
        if (_caseAuthorized[caseId][caller]) return true;
        if (caller == _cases[caseId].leadInvestigator) return true;
        if (hasRole(ADMIN_ROLE, caller)) return true;
        if (hasRole(SYSTEM_ROLE, caller)) return true;
        return false;
    }
}
