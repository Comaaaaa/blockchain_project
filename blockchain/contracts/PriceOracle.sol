// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceOracle
 * @notice On-chain oracle providing price data for tokenized real-world assets.
 *         The owner (oracle operator) pushes price updates on-chain.
 */
contract PriceOracle is Ownable {
    struct PriceData {
        uint256 price;       // Price in wei (18 decimals)
        uint256 updatedAt;
        uint256 confidence;  // 0-10000 (basis points, 10000 = 100% confidence)
    }

    // tokenAddress => PriceData
    mapping(address => PriceData) public prices;

    // Track all registered tokens
    address[] public registeredTokens;
    mapping(address => bool) public isRegistered;

    event PriceUpdated(
        address indexed token,
        uint256 price,
        uint256 confidence,
        uint256 timestamp
    );
    event TokenRegistered(address indexed token);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Update the price of a token.
     */
    function updatePrice(
        address token,
        uint256 price,
        uint256 confidence
    ) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(price > 0, "Price must be > 0");
        require(confidence <= 10000, "Confidence max 10000");

        if (!isRegistered[token]) {
            registeredTokens.push(token);
            isRegistered[token] = true;
            emit TokenRegistered(token);
        }

        prices[token] = PriceData({
            price: price,
            updatedAt: block.timestamp,
            confidence: confidence
        });

        emit PriceUpdated(token, price, confidence, block.timestamp);
    }

    /**
     * @notice Batch update prices for multiple tokens.
     */
    function batchUpdatePrices(
        address[] calldata tokens,
        uint256[] calldata _prices,
        uint256[] calldata confidences
    ) external onlyOwner {
        require(
            tokens.length == _prices.length && _prices.length == confidences.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < tokens.length; i++) {
            require(tokens[i] != address(0), "Invalid token address");
            require(_prices[i] > 0, "Price must be > 0");

            if (!isRegistered[tokens[i]]) {
                registeredTokens.push(tokens[i]);
                isRegistered[tokens[i]] = true;
                emit TokenRegistered(tokens[i]);
            }

            prices[tokens[i]] = PriceData({
                price: _prices[i],
                updatedAt: block.timestamp,
                confidence: confidences[i] <= 10000 ? confidences[i] : 10000
            });

            emit PriceUpdated(tokens[i], _prices[i], confidences[i], block.timestamp);
        }
    }

    /**
     * @notice Get the latest price for a token.
     */
    function getPrice(address token) external view returns (uint256 price, uint256 updatedAt, uint256 confidence) {
        PriceData memory data = prices[token];
        return (data.price, data.updatedAt, data.confidence);
    }

    /**
     * @notice Check if a price is stale (older than maxAge seconds).
     */
    function isPriceStale(address token, uint256 maxAge) external view returns (bool) {
        if (prices[token].updatedAt == 0) return true;
        return (block.timestamp - prices[token].updatedAt) > maxAge;
    }

    function getRegisteredTokensCount() external view returns (uint256) {
        return registeredTokens.length;
    }

    function getAllRegisteredTokens() external view returns (address[] memory) {
        return registeredTokens;
    }
}
