// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// ERC-20 token for VC fund shares with KYC transfer restrictions
contract VCToken is ERC20, ERC20Pausable, AccessControl, Ownable {
    // Role constants
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TRANSFER_ADMIN_ROLE = keccak256("TRANSFER_ADMIN_ROLE");

    // Custom errors (cheaper than strings)
    error SenderNotWhitelisted();
    error RecipientNotWhitelisted();

    // Transfer restrictions
    bool public transferRestrictionsEnabled;
    mapping(address => bool) public whitelist;

    // Events
    event WhitelistAdded(address indexed account);
    event WhitelistRemoved(address indexed account);
    event TransferRestrictionsToggled(bool enabled);

    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        // Give owner all roles
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(TRANSFER_ADMIN_ROLE, initialOwner);

        // Restrictions on by default
        transferRestrictionsEnabled = true;
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setTransferRestrictions(bool enabled) public onlyRole(TRANSFER_ADMIN_ROLE) {
        transferRestrictionsEnabled = enabled;
        emit TransferRestrictionsToggled(enabled);
    }

    function addToWhitelist(address account) public onlyRole(TRANSFER_ADMIN_ROLE) {
        whitelist[account] = true;
        emit WhitelistAdded(account);
    }

    function removeFromWhitelist(address account) public onlyRole(TRANSFER_ADMIN_ROLE) {
        whitelist[account] = false;
        emit WhitelistRemoved(account);
    }

    // Batch operations for efficiency
    function batchAddToWhitelist(address[] memory accounts) public onlyRole(TRANSFER_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = true;
            emit WhitelistAdded(accounts[i]);
        }
    }

    function batchRemoveFromWhitelist(address[] memory accounts) public onlyRole(TRANSFER_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = false;
            emit WhitelistRemoved(accounts[i]);
        }
    }

    // Override transfer to check whitelist
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        if (transferRestrictionsEnabled) {
            if (from != address(0) && to != address(0)) {
                // Regular transfer - both need to be whitelisted
                if (!whitelist[from]) revert SenderNotWhitelisted();
                if (!whitelist[to]) revert RecipientNotWhitelisted();
            } else if (from == address(0)) {
                // Minting
                if (!whitelist[to]) revert RecipientNotWhitelisted();
            } else if (to == address(0)) {
                // Burning
                if (!whitelist[from]) revert SenderNotWhitelisted();
            }
        }

        super._update(from, to, amount);
    }

    function isWhitelisted(address account) public view returns (bool) {
        return whitelist[account];
    }
}

