// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ComplianceRegistry
 * @notice On-chain KYC verification with whitelist and blacklist management.
 *         Only whitelisted (and non-blacklisted) addresses can hold/trade tokenized assets.
 */
contract ComplianceRegistry is Ownable {
    mapping(address => bool) private _whitelisted;
    mapping(address => bool) private _blacklisted;
    mapping(address => uint256) private _kycTimestamp;

    event AddressWhitelisted(address indexed account, uint256 timestamp);
    event AddressRemovedFromWhitelist(address indexed account);
    event AddressBlacklisted(address indexed account, uint256 timestamp);
    event AddressRemovedFromBlacklist(address indexed account);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Add an address to the whitelist (KYC approved).
     */
    function addToWhitelist(address account) external onlyOwner {
        require(account != address(0), "Invalid address");
        require(!_blacklisted[account], "Address is blacklisted");
        _whitelisted[account] = true;
        _kycTimestamp[account] = block.timestamp;
        emit AddressWhitelisted(account, block.timestamp);
    }

    /**
     * @notice Batch whitelist multiple addresses.
     */
    function batchWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            require(accounts[i] != address(0), "Invalid address");
            if (!_blacklisted[accounts[i]]) {
                _whitelisted[accounts[i]] = true;
                _kycTimestamp[accounts[i]] = block.timestamp;
                emit AddressWhitelisted(accounts[i], block.timestamp);
            }
        }
    }

    /**
     * @notice Remove an address from the whitelist.
     */
    function removeFromWhitelist(address account) external onlyOwner {
        _whitelisted[account] = false;
        _kycTimestamp[account] = 0;
        emit AddressRemovedFromWhitelist(account);
    }

    /**
     * @notice Blacklist an address — overrides whitelist.
     */
    function addToBlacklist(address account) external onlyOwner {
        require(account != address(0), "Invalid address");
        _blacklisted[account] = true;
        _whitelisted[account] = false;
        _kycTimestamp[account] = 0;
        emit AddressBlacklisted(account, block.timestamp);
    }

    /**
     * @notice Remove an address from the blacklist.
     */
    function removeFromBlacklist(address account) external onlyOwner {
        _blacklisted[account] = false;
        emit AddressRemovedFromBlacklist(account);
    }

    /**
     * @notice Check if an address is compliant (whitelisted AND not blacklisted).
     */
    function isCompliant(address account) external view returns (bool) {
        return _whitelisted[account] && !_blacklisted[account];
    }

    function isWhitelisted(address account) external view returns (bool) {
        return _whitelisted[account];
    }

    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    function getKycTimestamp(address account) external view returns (uint256) {
        return _kycTimestamp[account];
    }
}
