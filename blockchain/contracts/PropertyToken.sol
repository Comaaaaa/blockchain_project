// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

/**
 * @title PropertyToken
 * @notice ERC-20 fungible token representing fractional ownership of a real estate property.
 *         Transfers are restricted to compliant (KYC-approved, non-blacklisted) addresses.
 */
contract PropertyToken is ERC20, Ownable {
    ComplianceRegistry public complianceRegistry;

    string public propertyId;
    uint256 public tokenPrice; // Price per token in wei
    uint256 public maxSupply;

    event TokensPurchased(address indexed buyer, uint256 amount, uint256 totalCost);
    event TokenPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _propertyId,
        uint256 _maxSupply,
        uint256 _tokenPrice,
        address _complianceRegistry
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        propertyId = _propertyId;
        maxSupply = _maxSupply;
        tokenPrice = _tokenPrice;
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        // Mint all tokens to the contract owner (property issuer)
        _mint(msg.sender, _maxSupply);
    }

    /**
     * @notice Buy tokens from the owner at the set price.
     */
    function buyTokens(uint256 amount) external payable {
        require(complianceRegistry.isCompliant(msg.sender), "Buyer not KYC compliant");
        require(amount > 0, "Amount must be > 0");
        uint256 cost = amount * tokenPrice;
        require(msg.value >= cost, "Insufficient ETH sent");

        address tokenOwner = owner();
        require(balanceOf(tokenOwner) >= amount, "Not enough tokens available");

        // Transfer tokens from owner to buyer
        _transfer(tokenOwner, msg.sender, amount);

        // Send ETH to owner
        (bool sent, ) = payable(tokenOwner).call{value: cost}("");
        require(sent, "ETH transfer failed");

        // Refund excess ETH
        if (msg.value > cost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - cost}("");
            require(refunded, "Refund failed");
        }

        emit TokensPurchased(msg.sender, amount, cost);
    }

    /**
     * @notice Update token price (owner only).
     */
    function setTokenPrice(uint256 _newPrice) external onlyOwner {
        uint256 oldPrice = tokenPrice;
        tokenPrice = _newPrice;
        emit TokenPriceUpdated(oldPrice, _newPrice);
    }

    /**
     * @notice Override transfer to enforce compliance.
     */
    function _update(address from, address to, uint256 value) internal override {
        // Allow minting (from == address(0)) and burning (to == address(0))
        if (from != address(0) && to != address(0)) {
            require(
                complianceRegistry.isCompliant(from),
                "Sender not KYC compliant"
            );
            require(
                complianceRegistry.isCompliant(to),
                "Recipient not KYC compliant"
            );
        }
        super._update(from, to, value);
    }

    function availableTokens() external view returns (uint256) {
        return balanceOf(owner());
    }
}
