// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TallyviewTypes} from "../libraries/TallyviewTypes.sol";

/// @title IAuditLedger
/// @author Tallyview
/// @notice The foundation contract of the Tallyview accountability platform.
///
///         Every registered nonprofit receives an Avalanche address on the Tallyview L1
///         as its onchain identity. The Tallyview relay operates it on the org's behalf —
///         the nonprofit interacts only with the SaaS dashboard.
///
///         Each org also gets a human-readable name (e.g. "unitedway-la") with forward
///         and reverse resolution, making organizations discoverable onchain without
///         exposing raw addresses to end users.
///
///         Nonprofits (or the relay acting on their behalf) submit Merkle roots of their
///         monthly financial data. Each root commits to a period's books. If the underlying
///         data is later altered, the hash mismatch is provable onchain.
///
///         This creates an immutable accountability timeline:
///         "Organization X's financials looked like THIS on date Y."
interface IAuditLedger {
    // -------------------------------------------------------------------------
    //  Errors
    // -------------------------------------------------------------------------

    error OrgNotRegistered();
    error OrgAlreadyRegistered();
    error OrgNotActive();
    error NameAlreadyTaken();
    error InvalidName();
    error PeriodAlreadySubmitted();
    error Unauthorized();
    error InvalidPeriod();
    error ZeroAddress();
    error ZeroMerkleRoot();
    error OrgNotProvisioned();

    // -------------------------------------------------------------------------
    //  Events
    // -------------------------------------------------------------------------

    /// @notice Emitted when an org submits a monthly financial attestation.
    event AuditSubmitted(
        address indexed org,
        uint16 indexed year,
        uint8 indexed month,
        bytes32 merkleRoot
    );

    /// @notice Emitted when a new nonprofit is registered on the platform.
    event OrganizationRegistered(address indexed org, string name);

    /// @notice Emitted when an org is soft-deactivated. History remains onchain.
    event OrganizationDeactivated(address indexed org);

    /// @notice Emitted when an admin corrects an org's human-readable name.
    event OrganizationNameUpdated(
        address indexed org,
        string oldName,
        string newName
    );

    // -------------------------------------------------------------------------
    //  Organization Management
    // -------------------------------------------------------------------------

    /// @notice Register a nonprofit with an onchain identity and human-readable name.
    /// @param org     The Avalanche address that will represent this organization.
    /// @param name    A unique, lowercase, hyphen-allowed identifier (e.g. "unitedway-la").
    /// @param einHash keccak256 of the org's EIN — used for offchain cross-referencing only.
    function registerOrganization(
        address org,
        string calldata name,
        bytes32 einHash
    ) external;

    /// @notice Update an org's human-readable name. Admin only, for corrections.
    ///         Releases the old name so it can be claimed by another org.
    /// @param org     The org's address.
    /// @param newName The corrected name. Must pass validation and not be taken.
    function updateOrganizationName(
        address org,
        string calldata newName
    ) external;

    /// @notice Soft-deactivate an org. Prevents new submissions but preserves all
    ///         history and name resolution. Deactivation is not deletion.
    /// @param org The org's address.
    function deactivateOrganization(address org) external;

    // -------------------------------------------------------------------------
    //  Name Resolution
    //  These functions form a self-contained naming module. When Tallyview
    //  migrates to a dedicated naming protocol (AKA Protocol), only this
    //  section's implementation changes — callers and dependent contracts
    //  continue using the same interface.
    // -------------------------------------------------------------------------

    /// @notice Forward resolution: human-readable name to Avalanche address.
    /// @param name The org's registered name.
    /// @return The org's address, or address(0) if the name is not registered.
    function resolveByName(
        string calldata name
    ) external view returns (address);

    /// @notice Reverse resolution: Avalanche address to human-readable name.
    /// @param org The org's address.
    /// @return The org's name, or an empty string if no name is registered.
    function nameOf(address org) external view returns (string memory);

    /// @notice Check whether a name is already claimed by a registered org.
    /// @param name The name to check.
    /// @return True if the name is taken.
    function isNameTaken(string calldata name) external view returns (bool);

    // -------------------------------------------------------------------------
    //  Audit Operations
    // -------------------------------------------------------------------------

    /// @notice Submit a monthly financial attestation for a registered org.
    ///         Callable by the org's own address or any address with SYSTEM_ROLE.
    ///         Each org+year+month combination can only be submitted once — entries
    ///         are immutable after creation.
    /// @param org        The org's address.
    /// @param year       The fiscal year (must be > 2020 and < 2100).
    /// @param month      The fiscal month (1–12).
    /// @param merkleRoot The Merkle root committing to the period's financial data.
    ///                   Must not be bytes32(0).
    /// @param schemaHash Hash of the mapping schema so verifiers know how the
    ///                   underlying data was structured.
    function submitAudit(
        address org,
        uint16 year,
        uint8 month,
        bytes32 merkleRoot,
        bytes32 schemaHash
    ) external;

    /// @notice Retrieve the audit entry for a specific org and period.
    /// @param org   The org's address.
    /// @param year  The fiscal year.
    /// @param month The fiscal month (1–12).
    /// @return The stored AuditEntry. All fields are zero if no entry exists —
    ///         check merkleRoot != bytes32(0) to confirm an entry was submitted.
    function getAudit(
        address org,
        uint16 year,
        uint8 month
    ) external view returns (TallyviewTypes.AuditEntry memory);

    /// @notice Retrieve the most recent audit submission for an org.
    ///         Returns (0, 0, zeroed entry) if the org has no submissions —
    ///         callers should check year != 0 before using the result.
    /// @param org The org's address.
    /// @return year  The year of the latest submission (0 if none).
    /// @return month The month of the latest submission (0 if none).
    /// @return entry The latest AuditEntry.
    function getLatestAudit(
        address org
    )
        external
        view
        returns (uint16 year, uint8 month, TallyviewTypes.AuditEntry memory entry);

    /// @notice Check whether an audit entry exists for a given org and period.
    /// @param org   The org's address.
    /// @param year  The fiscal year.
    /// @param month The fiscal month (1–12).
    /// @return True if an entry has been submitted for this period.
    function hasAuditForPeriod(
        address org,
        uint16 year,
        uint8 month
    ) external view returns (bool);

    // -------------------------------------------------------------------------
    //  Organization Queries
    // -------------------------------------------------------------------------

    /// @notice Get the full registration record for an org.
    /// @param org The org's address.
    /// @return The OrgRecord struct.
    function getOrganization(
        address org
    ) external view returns (TallyviewTypes.OrgRecord memory);

    /// @notice Check whether an address has been registered as an org.
    /// @param org The address to check.
    /// @return True if registered (regardless of active/inactive status).
    function isOrganizationRegistered(
        address org
    ) external view returns (bool);

    /// @notice Check whether a registered org is currently active.
    /// @param org The address to check.
    /// @return True if registered and active.
    function isOrganizationActive(
        address org
    ) external view returns (bool);

    /// @notice Get the total number of audit submissions for an org.
    /// @param org The org's address.
    /// @return The count of submitted periods.
    function getSubmissionCount(
        address org
    ) external view returns (uint256);

    // -------------------------------------------------------------------------
    //  Avalanche L1
    // -------------------------------------------------------------------------

    /// @notice Check whether an address is provisioned on the Subnet-EVM
    ///         TxAllowList. Returns true when avalancheMode is disabled (the
    ///         precompile is not available outside Avalanche L1 networks).
    /// @param addr The address to check.
    /// @return True if the address has at least Enabled status on the
    ///         TxAllowList, or if the contract is running outside Avalanche.
    function isProvisionedOnSubnet(address addr) external view returns (bool);
}
