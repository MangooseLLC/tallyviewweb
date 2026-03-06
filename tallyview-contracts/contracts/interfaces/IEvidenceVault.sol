// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IEvidenceVault
/// @author Tallyview
/// @notice Investigation evidence contract for the Tallyview Avalanche L1.
///
///         EvidenceVault anchors investigation evidence onchain with chain-of-custody
///         metadata, creating cryptographically verifiable records that prove what
///         evidence existed at what time, who submitted it, and how it was classified.
///         Evidence is immutable once submitted — the hash, timestamp, submitter, and
///         classification are permanent.
///
///         This is the contract that matters most for FCA (False Claims Act) litigation.
///         In fraud cases, the defense argues evidence was fabricated, backdated, or
///         selectively compiled after the fact. When evidence is hashed and committed to
///         a publicly verifiable chain with a provable timestamp, that argument collapses.
///         The chain proves the evidence existed in a specific form at a specific time.
///
///         The investigation pipeline EvidenceVault supports:
///
///           Tip → Analysis → Discovery → Filing → Recovery → Closed
///
///         Each stage represents a real phase of nonprofit fraud investigation:
///           - Tip:       A whistleblower submits a tip. The relay hashes and anchors it
///                        onchain. The transaction hash is the receipt proving temporal
///                        priority — critical for qui tam standing.
///           - Analysis:  The AI engine or an investigator produces analysis outputs
///                        (evidence briefs, financial summaries, pattern matches).
///           - Discovery: Additional evidence is submitted and linked to a case. Each
///                        submission extends the chain of custody.
///           - Filing:    Formal filing (qui tam complaint, AG enforcement action). The
///                        evidence chain provides the legal record's foundation.
///           - Recovery:  Recovered funds are tracked, closing the fraud lifecycle loop.
///           - Closed:    Investigation complete. No further evidence accepted.
///
///         Evidence can be "sealed" by a regulator, restricting access to authorized
///         investigators and counsel. Sealing is forward-only — once sealed, cannot be
///         unsealed. This protects active investigations from premature disclosure.
///
///         Per-case access control maps to real investigation workflows: investigators
///         are granted access to specific cases on a need-to-know basis. A regulator
///         authorizes an investigator for Case X, and that investigator can then submit
///         and view evidence for Case X only.
///
///         Closing and sealing are independent lifecycle events. A case can be sealed
///         but still active (accepting evidence with restricted visibility), or closed
///         but unsealed (evidence publicly readable but no new submissions).
///
///         EvidenceVault references IAuditLedger for org validation on case creation
///         only. The target org must be registered but does NOT need to be active —
///         you can investigate deactivated orgs. Evidence entries may carry soft
///         references (bytes32) to AnomalyRegistry anomalies or EntityGraph entities,
///         but EvidenceVault does NOT import those contracts. These are cross-contract
///         breadcrumbs decoded by the SaaS layer, not hard dependencies.
///
///         Rich events on every state change — case creation, stage advancement,
///         sealing, closure, evidence submission — build the chain of custody
///         automatically. Combined with Avalanche's sub-second finality, every action
///         has a legally meaningful provable timestamp.
interface IEvidenceVault {
    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error CaseNotFound();
    error CaseAlreadyExists();
    /// @dev Named CaseIsClosed (not CaseClosed) to avoid collision with the
    ///      CaseClosed event name.
    error CaseIsClosed();
    error CaseAlreadySealed();
    error EvidenceNotFound();
    error EvidenceAlreadySealed();
    error InvalidStageTransition();
    error NotCaseAuthorized();
    error CannotRevokeLead();
    error OrgNotRegistered();
    error Unauthorized();
    error ZeroAddress();
    error EmptyDescription();
    error DescriptionTooLong();
    error ZeroContentHash();

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when a new investigation case is opened.
    ///         The title is intentionally excluded — same rationale as prior contracts
    ///         (avoid string gas costs in events). The title is readable from
    ///         getCase(caseId) after the event fires.
    event CaseCreated(
        bytes32 indexed caseId,
        address indexed targetOrg,
        address indexed leadInvestigator
    );

    /// @notice Emitted when a case's investigation stage advances.
    ///         Stages are forward-only. The Closed stage is only set via closeCase,
    ///         which emits both CaseClosed and CaseStageChanged.
    event CaseStageChanged(
        bytes32 indexed caseId,
        TallyviewTypes.InvestigationStage oldStage,
        TallyviewTypes.InvestigationStage newStage
    );

    /// @notice Emitted when a regulator or admin seals a case, restricting
    ///         evidence access to authorized investigators and counsel.
    ///         Sealing is permanent — once emitted, no unsealing event follows.
    event CaseSealed(bytes32 indexed caseId, address indexed sealedBy);

    /// @notice Emitted when a case is closed. After closure, no new evidence
    ///         can be submitted. Existing evidence and case data remain readable.
    event CaseClosed(bytes32 indexed caseId);

    /// @notice Emitted when an investigator is granted access to a case's evidence.
    event InvestigatorAuthorized(
        bytes32 indexed caseId,
        address indexed investigator
    );

    /// @notice Emitted when an investigator's access to a case is revoked.
    ///         The lead investigator cannot be revoked.
    event InvestigatorRevoked(
        bytes32 indexed caseId,
        address indexed investigator
    );

    /// @notice Emitted when evidence is submitted to a case. The classification
    ///         is included as a non-indexed parameter so dashboard consumers can
    ///         filter by evidence type without a separate read. The description is
    ///         excluded (string gas cost) — read via getEvidence(evidenceIndex).
    event EvidenceSubmitted(
        uint256 indexed evidenceIndex,
        bytes32 indexed caseId,
        address indexed submitter,
        TallyviewTypes.EvidenceClassification classification
    );

    /// @notice Emitted when a specific evidence entry is sealed by a regulator
    ///         or admin. Individual evidence sealing is independent of case-level
    ///         sealing — an evidence entry can be sealed in an unsealed case.
    event EvidenceSealed(
        uint256 indexed evidenceIndex,
        bytes32 indexed caseId,
        address indexed sealedBy
    );

    // -------------------------------------------------------------------------
    //  Case Management
    // -------------------------------------------------------------------------

    /// @notice Open a new investigation case targeting a registered nonprofit.
    ///         The target org must be registered in AuditLedger but does NOT need
    ///         to be active — investigating deactivated orgs is valid and expected.
    ///         The lead investigator is automatically authorized for the case.
    /// @dev    Only ADMIN_ROLE or SYSTEM_ROLE. Reverts with CaseAlreadyExists if
    ///         the caseId is already registered (sentinel: openedAt > 0). Title
    ///         must be non-empty and at most MAX_DESCRIPTION_LENGTH bytes.
    /// @param caseId           Caller-provided unique identifier for this case
    ///                         (e.g., keccak256 of "CASE-2026-UCHS").
    /// @param targetOrg        The nonprofit under investigation. Must be registered
    ///                         in AuditLedger.
    /// @param title            Brief case description (max 200 characters).
    /// @param leadInvestigator Primary investigator assigned. Must not be address(0).
    ///                         Automatically receives per-case authorization.
    function createCase(
        bytes32 caseId,
        address targetOrg,
        string calldata title,
        address leadInvestigator
    ) external;

    /// @notice Advance a case's investigation stage. Forward-only: the new stage
    ///         must have a strictly higher ordinal than the current stage. Stage
    ///         skipping is allowed (Tip → Discovery is valid if analysis happened
    ///         offchain).
    ///
    ///         CANNOT set stage to Closed — use closeCase() instead. This preserves
    ///         the admin-only closure gate. Validation:
    ///           uint8(newStage) > uint8(currentStage) && newStage != Closed
    /// @dev    Only ADMIN_ROLE or SYSTEM_ROLE. Case must exist and not be closed.
    /// @param caseId  The case to advance.
    /// @param newStage The target stage. Must be strictly forward and not Closed.
    function updateCaseStage(
        bytes32 caseId,
        TallyviewTypes.InvestigationStage newStage
    ) external;

    /// @notice Seal a case, restricting all evidence to authorized parties only.
    ///         All existing evidence entries for the case are set to SealStatus.Sealed.
    ///         Sealing is permanent — once sealed, a case cannot be unsealed. New
    ///         evidence submitted to a sealed case automatically inherits Sealed status.
    /// @dev    Only ADMIN_ROLE or REGULATOR_ROLE. Case must exist. Reverts with
    ///         CaseAlreadySealed if already sealed.
    /// @param caseId The case to seal.
    function sealCase(bytes32 caseId) external;

    /// @notice Close a case. Sets closedAt timestamp and stage to Closed. After
    ///         closure, no new evidence can be submitted. This is the ONLY way to
    ///         set a case's stage to Closed — updateCaseStage explicitly excludes it.
    ///         Emits both CaseClosed and CaseStageChanged.
    /// @dev    Only ADMIN_ROLE. Reverts with CaseIsClosed if already closed
    ///         (closedAt > 0).
    /// @param caseId The case to close.
    function closeCase(bytes32 caseId) external;

    /// @notice Grant an investigator access to submit and view evidence for a case.
    ///         Per-case authorization maps to real investigation workflows —
    ///         investigators get need-to-know access, not global access.
    /// @dev    Only ADMIN_ROLE, SYSTEM_ROLE, or REGULATOR_ROLE. Case must exist.
    ///         Reverts with ZeroAddress if investigator is address(0).
    /// @param caseId       The case to grant access for.
    /// @param investigator The address to authorize.
    function authorizeInvestigator(
        bytes32 caseId,
        address investigator
    ) external;

    /// @notice Revoke an investigator's access to a case. The lead investigator
    ///         cannot be revoked — reverts with CannotRevokeLead.
    /// @dev    Only ADMIN_ROLE or REGULATOR_ROLE. Case must exist.
    /// @param caseId       The case to revoke access for.
    /// @param investigator The address to revoke.
    function revokeInvestigator(
        bytes32 caseId,
        address investigator
    ) external;

    // -------------------------------------------------------------------------
    //  Evidence Submission
    // -------------------------------------------------------------------------

    /// @notice Submit a piece of evidence to a case. Evidence is immutable once
    ///         submitted — the hash, timestamp, submitter, and classification are
    ///         permanent. This immutability is what makes the evidence chain
    ///         admissible-grade.
    ///
    ///         When classification is Tip, this is how whistleblower tips get
    ///         anchored onchain. The relay submits on behalf of the anonymous
    ///         whistleblower — only the relay address appears onchain as submitter.
    ///         The transaction hash serves as a receipt proving the tip existed at
    ///         a specific time, establishing temporal priority for qui tam standing.
    ///
    ///         If the case is sealed, new evidence automatically inherits
    ///         SealStatus.Sealed. Otherwise it starts as Unsealed.
    /// @dev    Case must exist and not be closed. Caller must pass the per-case
    ///         authorization check (per-case mapping, lead investigator, ADMIN_ROLE,
    ///         or SYSTEM_ROLE). REGULATOR_ROLE is NOT authorized to submit directly —
    ///         regulators seal and authorize, but submit through authorized
    ///         investigators. If a regulator needs to submit, they authorize
    ///         themselves for the case first.
    ///         Description must be non-empty and at most MAX_DESCRIPTION_LENGTH bytes.
    ///         contentHash must not be bytes32(0).
    /// @param caseId           The case this evidence belongs to.
    /// @param classification   Evidence type (Tip, FinancialRecord, AnalysisReport, etc.).
    /// @param description      Brief description (max 200 characters).
    /// @param contentHash      Hash of the actual evidence document/data. The content
    ///                         stays offchain — this hash proves what existed when.
    /// @param relatedAnomalyId Optional soft reference to an AnomalyRegistry anomaly.
    ///                         Pass bytes32(0) if none. Decoded by the SaaS layer.
    /// @param relatedEntityId  Optional soft reference to an EntityGraph entity.
    ///                         Pass bytes32(0) if none. Decoded by the SaaS layer.
    /// @return evidenceIndex   The monotonic index of the new entry in the evidence
    ///                         array. This index is the evidence's permanent unique ID.
    function submitEvidence(
        bytes32 caseId,
        TallyviewTypes.EvidenceClassification classification,
        string calldata description,
        bytes32 contentHash,
        bytes32 relatedAnomalyId,
        bytes32 relatedEntityId
    ) external returns (uint256 evidenceIndex);

    /// @notice Seal a specific evidence entry. Sealed evidence is visible only to
    ///         authorized investigators and counsel. Sealing is permanent — once
    ///         sealed, cannot be unsealed.
    /// @dev    Only ADMIN_ROLE or REGULATOR_ROLE. Reverts with EvidenceNotFound if
    ///         index is out of bounds. Reverts with EvidenceAlreadySealed if the
    ///         entry is already sealed.
    /// @param evidenceIndex The evidence array index to seal.
    function sealEvidence(uint256 evidenceIndex) external;

    // -------------------------------------------------------------------------
    //  Queries — Cases
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full case record by its identifier.
    /// @param caseId The case's identifier.
    /// @return The stored Case struct. Reverts with CaseNotFound if the case
    ///         does not exist (sentinel: openedAt == 0).
    function getCase(
        bytes32 caseId
    ) external view returns (TallyviewTypes.Case memory);

    /// @notice Get all case IDs targeting a specific organization.
    ///         Returns both open and closed cases — the full investigation history
    ///         for this org.
    /// @param org The target org's address.
    /// @return An array of bytes32 caseIds (may be empty).
    function getCasesForOrg(
        address org
    ) external view returns (bytes32[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Evidence
    // -------------------------------------------------------------------------

    /// @notice Retrieve the full evidence record by its monotonic index.
    ///         Evidence uses a flat array — the index IS the unique identifier,
    ///         guaranteeing uniqueness even with multiple submissions in the same
    ///         block.
    /// @param evidenceIndex The evidence's array index.
    /// @return The stored EvidenceEntry. Reverts with EvidenceNotFound if out of
    ///         bounds.
    function getEvidence(
        uint256 evidenceIndex
    ) external view returns (TallyviewTypes.EvidenceEntry memory);

    /// @notice Get the total number of evidence entries across all cases.
    /// @return The current length of the evidence array.
    function getEvidenceCount() external view returns (uint256);

    /// @notice Get all evidence indices for a specific case.
    /// @param caseId The case's identifier.
    /// @return An array of uint256 indices into the evidence array (may be empty).
    function getEvidenceForCase(
        bytes32 caseId
    ) external view returns (uint256[] memory);

    // -------------------------------------------------------------------------
    //  Queries — Access Control
    // -------------------------------------------------------------------------

    /// @notice Check whether an address is authorized to submit evidence to a case.
    ///         Four authorization paths:
    ///           1. Per-case authorization mapping (set via authorizeInvestigator)
    ///           2. Lead investigator for the case
    ///           3. ADMIN_ROLE
    ///           4. SYSTEM_ROLE
    ///         REGULATOR_ROLE is deliberately excluded — regulators seal and authorize
    ///         but do not submit evidence directly. If a regulator needs to submit,
    ///         they authorize themselves for the case first.
    /// @param caseId  The case to check.
    /// @param account The address to check.
    /// @return True if the account can submit evidence to this case.
    function isCaseAuthorized(
        bytes32 caseId,
        address account
    ) external view returns (bool);

    // -------------------------------------------------------------------------
    //  Queries — Aggregate
    // -------------------------------------------------------------------------

    /// @notice Quick investigation summary for a case. Returns counts suitable
    ///         for dashboard summary cards. Combined with Avalanche's sub-second
    ///         finality, this gives investigators a real-time case snapshot.
    /// @param caseId The case's identifier.
    /// @return evidenceCount Total evidence entries submitted to this case.
    /// @return stage         The case's current investigation stage.
    /// @return isSealed      Whether the case is sealed (access-restricted).
    function getCaseSummary(
        bytes32 caseId
    )
        external
        view
        returns (
            uint256 evidenceCount,
            TallyviewTypes.InvestigationStage stage,
            bool isSealed
        );
}
