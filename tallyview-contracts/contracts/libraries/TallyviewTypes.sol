// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TallyviewTypes
/// @notice Shared types for the Tallyview contract system.
///         Lives in a library so all five contracts (AuditLedger, ComplianceEngine,
///         AnomalyRegistry, EntityGraph, EvidenceVault) reference the same definitions.
library TallyviewTypes {
    /// @notice Access roles across the Tallyview platform.
    enum Role {
        None,
        Nonprofit,
        Foundation,
        Regulator,
        Investigator,
        System
    }

    /// @notice Registration data for a nonprofit organization.
    ///         The org's Avalanche address is the primary key (stored as the mapping key,
    ///         not inside this struct). The human-readable name provides discoverability
    ///         via forward/reverse resolution.
    struct OrgRecord {
        string name;
        bytes32 einHash;
        uint48 registeredAt;
        uint16 latestYear;
        uint8 latestMonth;
        bool active;
    }

    /// @notice A single monthly financial attestation.
    ///         The merkleRoot commits to the org's financial data for the period.
    ///         A zero merkleRoot means no entry exists — submitting bytes32(0) is rejected.
    struct AuditEntry {
        bytes32 merkleRoot;
        bytes32 schemaHash;
        uint48 timestamp;
        address submitter;
    }
}
