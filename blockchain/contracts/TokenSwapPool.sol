// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

/**
 * @title TokenSwapPool
 * @notice Simple AMM liquidity pool (constant product x*y=k) for swapping
 *         PropertyTokens against ETH. Only compliant users can swap.
 *         Inspired by Uniswap V2 — used for educational/demo purposes.
 */
contract TokenSwapPool is Ownable {
    IERC20 public token;
    ComplianceRegistry public complianceRegistry;

    uint256 public reserveToken;
    uint256 public reserveETH;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    uint256 public constant FEE_BPS = 30; // 0.3% swap fee

    event LiquidityAdded(address indexed provider, uint256 tokenAmount, uint256 ethAmount, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 tokenAmount, uint256 ethAmount);
    event SwapTokenForETH(address indexed user, uint256 tokenIn, uint256 ethOut);
    event SwapETHForToken(address indexed user, uint256 ethIn, uint256 tokenOut);

    constructor(
        address _token,
        address _complianceRegistry
    ) Ownable(msg.sender) {
        token = IERC20(_token);
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
    }

    /**
     * @notice Add initial liquidity to the pool.
     */
    function addLiquidity(uint256 tokenAmount) external payable returns (uint256) {
        require(complianceRegistry.isCompliant(msg.sender), "Not KYC compliant");
        require(tokenAmount > 0 && msg.value > 0, "Must provide both token and ETH");

        uint256 lpTokens;

        if (totalLiquidity == 0) {
            // First liquidity provider sets the ratio
            lpTokens = msg.value; // LP tokens = ETH amount for simplicity
            totalLiquidity = lpTokens;
        } else {
            // Subsequent providers must match the current ratio
            uint256 ethOptimal = (tokenAmount * reserveETH) / reserveToken;
            require(msg.value >= ethOptimal, "Insufficient ETH for ratio");

            lpTokens = (msg.value * totalLiquidity) / reserveETH;
            totalLiquidity += lpTokens;
        }

        require(
            token.transferFrom(msg.sender, address(this), tokenAmount),
            "Token transfer failed"
        );

        reserveToken += tokenAmount;
        reserveETH += msg.value;
        liquidity[msg.sender] += lpTokens;

        emit LiquidityAdded(msg.sender, tokenAmount, msg.value, lpTokens);
        return lpTokens;
    }

    /**
     * @notice Remove liquidity from the pool.
     */
    function removeLiquidity(uint256 lpAmount) external {
        require(liquidity[msg.sender] >= lpAmount, "Insufficient LP tokens");
        require(totalLiquidity > 0, "No liquidity");

        uint256 tokenAmount = (lpAmount * reserveToken) / totalLiquidity;
        uint256 ethAmount = (lpAmount * reserveETH) / totalLiquidity;

        liquidity[msg.sender] -= lpAmount;
        totalLiquidity -= lpAmount;
        reserveToken -= tokenAmount;
        reserveETH -= ethAmount;

        require(token.transfer(msg.sender, tokenAmount), "Token transfer failed");
        (bool sent, ) = payable(msg.sender).call{value: ethAmount}("");
        require(sent, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, tokenAmount, ethAmount);
    }

    /**
     * @notice Swap ETH for tokens.
     */
    function swapETHForToken() external payable {
        require(complianceRegistry.isCompliant(msg.sender), "Not KYC compliant");
        require(msg.value > 0, "Must send ETH");
        require(reserveToken > 0 && reserveETH > 0, "No liquidity");

        uint256 ethInAfterFee = (msg.value * (10000 - FEE_BPS)) / 10000;
        uint256 tokenOut = (ethInAfterFee * reserveToken) / (reserveETH + ethInAfterFee);

        require(tokenOut > 0, "Insufficient output");
        require(tokenOut < reserveToken, "Exceeds reserve");

        reserveETH += msg.value;
        reserveToken -= tokenOut;

        require(token.transfer(msg.sender, tokenOut), "Token transfer failed");

        emit SwapETHForToken(msg.sender, msg.value, tokenOut);
    }

    /**
     * @notice Swap tokens for ETH.
     */
    function swapTokenForETH(uint256 tokenIn) external {
        require(complianceRegistry.isCompliant(msg.sender), "Not KYC compliant");
        require(tokenIn > 0, "Must send tokens");
        require(reserveToken > 0 && reserveETH > 0, "No liquidity");

        uint256 tokenInAfterFee = (tokenIn * (10000 - FEE_BPS)) / 10000;
        uint256 ethOut = (tokenInAfterFee * reserveETH) / (reserveToken + tokenInAfterFee);

        require(ethOut > 0, "Insufficient output");
        require(ethOut < reserveETH, "Exceeds reserve");

        require(
            token.transferFrom(msg.sender, address(this), tokenIn),
            "Token transfer failed"
        );

        reserveToken += tokenIn;
        reserveETH -= ethOut;

        (bool sent, ) = payable(msg.sender).call{value: ethOut}("");
        require(sent, "ETH transfer failed");

        emit SwapTokenForETH(msg.sender, tokenIn, ethOut);
    }

    /**
     * @notice Get the expected output for a swap.
     */
    function getTokenOutForETH(uint256 ethIn) external view returns (uint256) {
        if (reserveToken == 0 || reserveETH == 0) return 0;
        uint256 ethInAfterFee = (ethIn * (10000 - FEE_BPS)) / 10000;
        return (ethInAfterFee * reserveToken) / (reserveETH + ethInAfterFee);
    }

    function getETHOutForToken(uint256 tokenIn) external view returns (uint256) {
        if (reserveToken == 0 || reserveETH == 0) return 0;
        uint256 tokenInAfterFee = (tokenIn * (10000 - FEE_BPS)) / 10000;
        return (tokenInAfterFee * reserveETH) / (reserveToken + tokenInAfterFee);
    }

    function getSpotPrice() external view returns (uint256) {
        if (reserveToken == 0) return 0;
        return (reserveETH * 1e18) / reserveToken;
    }
}
