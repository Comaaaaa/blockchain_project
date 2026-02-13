// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./ComplianceRegistry.sol";

/**
 * @title NFTMarketplace
 * @notice On-chain marketplace for trading PropertyNFT (ERC-721) between whitelisted users.
 */
contract NFTMarketplace is Ownable {
    ComplianceRegistry public complianceRegistry;

    struct NFTListing {
        uint256 id;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price; // total price in wei
        bool active;
        uint256 createdAt;
    }

    uint256 public nextListingId;
    mapping(uint256 => NFTListing) public listings;

    // Fee in basis points (e.g. 100 = 1%)
    uint256 public feeBps = 100;
    address public feeRecipient;

    event NFTListed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );
    event NFTSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 tokenId,
        uint256 price
    );
    event NFTListingCancelled(uint256 indexed listingId);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _complianceRegistry) Ownable(msg.sender) {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
        feeRecipient = msg.sender;
    }

    /**
     * @notice Create a listing to sell an NFT.
     *         Seller must approve this contract to transfer the NFT first.
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256) {
        require(complianceRegistry.isCompliant(msg.sender), "Seller not KYC compliant");
        require(price > 0, "Price must be > 0");

        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not the NFT owner");
        require(
            nft.getApproved(tokenId) == address(this) ||
            nft.isApprovedForAll(msg.sender, address(this)),
            "Approve marketplace first"
        );

        uint256 listingId = nextListingId++;
        listings[listingId] = NFTListing({
            id: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true,
            createdAt: block.timestamp
        });

        emit NFTListed(listingId, msg.sender, nftContract, tokenId, price);
        return listingId;
    }

    /**
     * @notice Buy an NFT from a listing.
     */
    function buyListing(uint256 listingId) external payable {
        NFTListing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(complianceRegistry.isCompliant(msg.sender), "Buyer not KYC compliant");
        require(msg.sender != listing.seller, "Cannot buy own listing");
        require(msg.value >= listing.price, "Insufficient ETH sent");

        listing.active = false;

        // Transfer NFT from seller to buyer
        IERC721(listing.nftContract).safeTransferFrom(listing.seller, msg.sender, listing.tokenId);

        // Calculate and transfer fees
        uint256 fee = (listing.price * feeBps) / 10000;
        uint256 sellerAmount = listing.price - fee;

        (bool sentSeller, ) = payable(listing.seller).call{value: sellerAmount}("");
        require(sentSeller, "ETH transfer to seller failed");

        if (fee > 0) {
            (bool sentFee, ) = payable(feeRecipient).call{value: fee}("");
            require(sentFee, "Fee transfer failed");
        }

        // Refund excess
        if (msg.value > listing.price) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - listing.price}("");
            require(refunded, "Refund failed");
        }

        emit NFTSold(listingId, msg.sender, listing.tokenId, listing.price);
    }

    /**
     * @notice Cancel an active listing (seller only).
     */
    function cancelListing(uint256 listingId) external {
        NFTListing storage listing = listings[listingId];
        require(listing.active, "Listing not active");
        require(listing.seller == msg.sender, "Only seller can cancel");

        listing.active = false;
        emit NFTListingCancelled(listingId);
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

    function getListing(uint256 listingId) external view returns (NFTListing memory) {
        return listings[listingId];
    }

    function getActiveListingsCount() external view returns (uint256 count) {
        for (uint256 i = 0; i < nextListingId; i++) {
            if (listings[i].active) count++;
        }
    }
}
