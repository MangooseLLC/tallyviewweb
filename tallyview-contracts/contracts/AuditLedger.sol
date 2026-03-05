// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import {TallyviewTypes} from "./libraries/TallyviewTypes.sol";
import {IAuditLedger} from "./interfaces/IAuditLedger.sol";

/// @dev Minimal Subnet-EVM TxAllowList precompile interface.
///      Full version available in the avalabs/subnet-evm-contracts package.
interface IAllowList {
    function readAllowList(address addr) external view returns (uint256);
}

/// @title AuditLedger
/// @author Tallyview
/// @notice Foundation contract for the Tallyview accountability platform.
///         Stores nonprofit registrations, human-readable name resolution,
///         and immutable monthly financial attestations on an Avalanche L1.
/// @dev UUPS upgradeable. Deployed behind an ERC1967 proxy.
///      Optionally integrates with the Subnet-EVM TxAllowList precompile
///      to verify org addresses are provisioned on the L1 before onboarding.
contract AuditLedger is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IAuditLedger
{
    // -------------------------------------------------------------------------
    //  Roles
    // -------------------------------------------------------------------------

    /// @notice Granted to the Tallyview relay service. Can submit audits on
    ///         behalf of any registered org.
    bytes32 public constant SYSTEM_ROLE = keccak256("SYSTEM_ROLE");

    /// @notice Platform administrators. Can register orgs, update names,
    ///         deactivate orgs, and authorize upgrades.
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // -------------------------------------------------------------------------
    //  Storage
    // -------------------------------------------------------------------------

    /// @dev Org registration data. Primary key is the org's Avalanche address.
    mapping(address => TallyviewTypes.OrgRecord) private _orgs;

    /// @dev Forward name resolution: keccak256(name) → org address.
    ///      Hashing is explicit via _nameHash() rather than relying on
    ///      Solidity's implicit string-key hashing.
    mapping(bytes32 => address) private _nameToAddress;

    /// @dev Reverse name resolution: org address → human-readable name.
    mapping(address => string) private _addressToName;

    /// @dev Audit entries keyed by _periodKey(org, year, month).
    ///      A zero merkleRoot means no entry exists for that period.
    mapping(bytes32 => TallyviewTypes.AuditEntry) private _audits;

    /// @dev Number of audit submissions per org.
    mapping(address => uint256) private _submissionCounts;

    // -------------------------------------------------------------------------
    //  Avalanche L1
    // -------------------------------------------------------------------------

    /// @dev Subnet-EVM TxAllowList precompile. Only available on Avalanche L1s
    ///      with TxAllowList enabled in the chain genesis config.
    address private constant TX_ALLOW_LIST =
        0x0200000000000000000000000000000000000002;

    /// @dev When true, org registration verifies addresses are provisioned on
    ///      the Subnet-EVM TxAllowList before onboarding. Disabled for local
    ///      Hardhat testing where precompiles are not available.
    bool private _avalancheMode;

    /// @dev Reserved storage for future upgrades.
    uint256[49] private __gap;

    // -------------------------------------------------------------------------
    //  Initialization
    // -------------------------------------------------------------------------

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract. Called once through the proxy.
    ///         Grants the deployer DEFAULT_ADMIN_ROLE and ADMIN_ROLE.
    /// @param avalancheMode_ True when deployed to an Avalanche L1 with
    ///        TxAllowList enabled. False for local/non-Avalanche environments.
    function initialize(bool avalancheMode_) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        _avalancheMode = avalancheMode_;
    }

    // -------------------------------------------------------------------------
    //  Organization Management
    // -------------------------------------------------------------------------

    /// @inheritdoc IAuditLedger
    function registerOrganization(
        address org,
        string calldata name,
        bytes32 einHash
    ) external onlyRole(ADMIN_ROLE) {
        if (org == address(0)) revert ZeroAddress();
        if (_orgs[org].registeredAt > 0) revert OrgAlreadyRegistered();

        _validateName(name);
        if (_avalancheMode) _requireProvisioned(org);

        bytes32 nameKey = _nameHash(name);
        if (_nameToAddress[nameKey] != address(0)) revert NameAlreadyTaken();

        _orgs[org] = TallyviewTypes.OrgRecord({
            name: name,
            einHash: einHash,
            registeredAt: uint48(block.timestamp),
            latestYear: 0,
            latestMonth: 0,
            active: true
        });

        _nameToAddress[nameKey] = org;
        _addressToName[org] = name;

        emit OrganizationRegistered(org, name);
    }

    /// @inheritdoc IAuditLedger
    function updateOrganizationName(
        address org,
        string calldata newName
    ) external onlyRole(ADMIN_ROLE) {
        if (_orgs[org].registeredAt == 0) revert OrgNotRegistered();

        _validateName(newName);

        bytes32 newKey = _nameHash(newName);
        if (_nameToAddress[newKey] != address(0)) revert NameAlreadyTaken();

        string memory oldName = _addressToName[org];
        delete _nameToAddress[_nameHash(oldName)];

        _nameToAddress[newKey] = org;
        _addressToName[org] = newName;
        _orgs[org].name = newName;

        emit OrganizationNameUpdated(org, oldName, newName);
    }

    /// @inheritdoc IAuditLedger
    function deactivateOrganization(
        address org
    ) external onlyRole(ADMIN_ROLE) {
        if (_orgs[org].registeredAt == 0) revert OrgNotRegistered();
        if (!_orgs[org].active) revert OrgNotActive();

        _orgs[org].active = false;

        emit OrganizationDeactivated(org);
    }

    // -------------------------------------------------------------------------
    //  Name Resolution
    // -------------------------------------------------------------------------

    /// @inheritdoc IAuditLedger
    function resolveByName(
        string calldata name
    ) external view returns (address) {
        return _nameToAddress[_nameHash(name)];
    }

    /// @inheritdoc IAuditLedger
    function nameOf(address org) external view returns (string memory) {
        return _addressToName[org];
    }

    /// @inheritdoc IAuditLedger
    function isNameTaken(string calldata name) external view returns (bool) {
        return _nameToAddress[_nameHash(name)] != address(0);
    }

    // -------------------------------------------------------------------------
    //  Audit Operations
    // -------------------------------------------------------------------------

    /// @inheritdoc IAuditLedger
    function submitAudit(
        address org,
        uint16 year,
        uint8 month,
        bytes32 merkleRoot,
        bytes32 schemaHash
    ) external {
        if (_orgs[org].registeredAt == 0) revert OrgNotRegistered();
        if (!_orgs[org].active) revert OrgNotActive();
        if (msg.sender != org && !hasRole(SYSTEM_ROLE, msg.sender)) {
            revert Unauthorized();
        }
        if (merkleRoot == bytes32(0)) revert ZeroMerkleRoot();
        if (month == 0 || month > 12 || year <= 2020 || year >= 2100) {
            revert InvalidPeriod();
        }

        bytes32 key = _periodKey(org, year, month);
        if (_audits[key].merkleRoot != bytes32(0)) revert PeriodAlreadySubmitted();

        _audits[key] = TallyviewTypes.AuditEntry({
            merkleRoot: merkleRoot,
            schemaHash: schemaHash,
            timestamp: uint48(block.timestamp),
            submitter: msg.sender
        });

        TallyviewTypes.OrgRecord storage record = _orgs[org];
        if (
            year > record.latestYear ||
            (year == record.latestYear && month > record.latestMonth)
        ) {
            record.latestYear = year;
            record.latestMonth = month;
        }

        _submissionCounts[org]++;

        emit AuditSubmitted(org, year, month, merkleRoot);
    }

    /// @inheritdoc IAuditLedger
    function getAudit(
        address org,
        uint16 year,
        uint8 month
    ) external view returns (TallyviewTypes.AuditEntry memory) {
        return _audits[_periodKey(org, year, month)];
    }

    /// @inheritdoc IAuditLedger
    function getLatestAudit(
        address org
    )
        external
        view
        returns (
            uint16 year,
            uint8 month,
            TallyviewTypes.AuditEntry memory entry
        )
    {
        year = _orgs[org].latestYear;
        month = _orgs[org].latestMonth;
        if (year != 0) {
            entry = _audits[_periodKey(org, year, month)];
        }
    }

    /// @inheritdoc IAuditLedger
    function hasAuditForPeriod(
        address org,
        uint16 year,
        uint8 month
    ) external view returns (bool) {
        return _audits[_periodKey(org, year, month)].merkleRoot != bytes32(0);
    }

    // -------------------------------------------------------------------------
    //  Organization Queries
    // -------------------------------------------------------------------------

    /// @inheritdoc IAuditLedger
    function getOrganization(
        address org
    ) external view returns (TallyviewTypes.OrgRecord memory) {
        return _orgs[org];
    }

    /// @inheritdoc IAuditLedger
    function isOrganizationRegistered(
        address org
    ) external view returns (bool) {
        return _orgs[org].registeredAt > 0;
    }

    /// @inheritdoc IAuditLedger
    function isOrganizationActive(
        address org
    ) external view returns (bool) {
        return _orgs[org].active;
    }

    /// @inheritdoc IAuditLedger
    function getSubmissionCount(
        address org
    ) external view returns (uint256) {
        return _submissionCounts[org];
    }

    /// @inheritdoc IAuditLedger
    function isProvisionedOnSubnet(
        address addr
    ) external view returns (bool) {
        if (!_avalancheMode) return true;
        return IAllowList(TX_ALLOW_LIST).readAllowList(addr) > 0;
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

    /// @dev Storage key for an audit entry: keccak256(org ‖ year ‖ month).
    ///      20 + 2 + 1 = 23 bytes — no packed-encoding ambiguity.
    function _periodKey(
        address org,
        uint16 year,
        uint8 month
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(org, year, month));
    }

    /// @dev Hash a name for the forward resolution mapping key.
    function _nameHash(string memory name) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(name));
    }

    /// @dev Revert if the address is not provisioned on the Subnet-EVM
    ///      TxAllowList. Only called when _avalancheMode is true.
    function _requireProvisioned(address addr) internal view {
        if (IAllowList(TX_ALLOW_LIST).readAllowList(addr) == 0) {
            revert OrgNotProvisioned();
        }
    }

    /// @dev Validate a human-readable org name.
    ///      3–32 chars, lowercase a–z, digits 0–9, hyphens (not at start/end).
    function _validateName(string calldata name) internal pure {
        bytes calldata b = bytes(name);
        uint256 len = b.length;

        if (len < 3 || len > 32) revert InvalidName();
        if (b[0] == 0x2d || b[len - 1] == 0x2d) revert InvalidName();

        for (uint256 i; i < len; ) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7a) // a-z
                || (c >= 0x30 && c <= 0x39)        // 0-9
                || c == 0x2d;                       // hyphen
            if (!valid) revert InvalidName();
            unchecked { ++i; }
        }
    }
}
