// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./ComplianceRegistry.sol";

/**
 * @title PropertyMarketplace
 * @notice On-chain marketplace for trading PropertyTokens (ERC-20) between whitelisted users.
 */
contract PropertyMarketplace is Ownable {
    ComplianceRegistry public complianceRegistry;

    struct Listing {
        uint256 id;
        address seller;
        address tokenAddress;
        uint256 amount;
        uint256 pricePerToken; // in wei
        bool active;
        uint256 createdAt;
    }

    uint256 public nextListingId;
    mapping(uint256 => Listing) public listings;

    // Fee in basis points (e.g. 100 = 1%)
    uint256 public feeBps = 100;
    address public feeRecipient;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenAddress,
        uint256 amount,
        uint256 pricePerToken
    );
    event ListingCancelled(uint256 indexed listingId);
    event ListingSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _complianceRegistry) Ownable(msg.sender) {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        feeRecipient = msg.sender;
    }

    /**
     * @notice Create a listing to sell tokens.
     *         Seller must approve this contract to transfer their tokens first.
     */
    function createListing(
        address tokenAddress,
        uint256 amount,
        uint256 pricePerToken
    ) external returns (uint256) {
        require(complianceRegistry.isCompliant(msg.sender), "Seller not KYC compliant");
        require(amount > 0, "Amount must be > 0");
        require(pricePerToken > 0, "Price must be > 0");

        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(msg.sender) >= amount, "Insufficient token balance");
        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Approve marketplace first"
        );

        uint256 listingId = nextListingId++;
        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            tokenAddress: tokenAddress,
            amount: amount,
            pricePerToken: pricePerToken,
            active: true,
            createdAt: block.timestamp
        });

        emit ListingCreated(listingId, msg.sender, tokenAddress, amount, pricePerToken);
        return listingId;
    }

    /**
     * @notice Buy tokens from a listing.
     */
    function buyListing(uint256 listingId) external payable {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(complianceRegistry.isCompliant(msg.sender), "Buyer not KYC compliant");
        require(msg.sender != listing.seller, "Cannot buy own listing");

        uint256 totalPrice = listing.amount * listing.pricePerToken;
        require(msg.value >= totalPrice, "Insufficient ETH sent");

        listing.active = false;

        // Transfer tokens from seller to buyer
        IERC20 token = IERC20(listing.tokenAddress);
        require(
            token.transferFrom(listing.seller, msg.sender, listing.amount),
            "Token transfer failed"
        );

        // Calculate and transfer fees
        uint256 fee = (totalPrice * feeBps) / 10000;
        uint256 sellerAmount = totalPrice - fee;

        (bool sentSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sentSeller, "ETH transfer to seller failed");

        if (fee > 0) {
            (bool sentFee, ) = payable(feeRecipient).call{value: fee}("");
            require(sentFee, "Fee transfer failed");
        }

        // Refund excess
        if (msg.value > totalPrice) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalPrice}("");
            require(refunded, "Refund failed");
        }

        emit ListingSold(listingId, msg.sender, listing.amount, totalPrice);
    }

    /**
     * @notice Cancel an active listing (seller only).
     */
    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.active = false;
        emit ListingCancelled(listingId);
    }

    function setFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        uint256 oldFee = feeBps;
        feeBps = _feeBps;
        emit FeeUpdated(oldFee, _feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Invalid address");
        feeRecipient = _recipient;
    }

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getActiveListingsCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) count++;
        }
    }
}
