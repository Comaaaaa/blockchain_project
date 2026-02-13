// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ComplianceRegistry.sol";

/**
 * @title PropertyNFT
 * @notice ERC-721 non-fungible token representing unique real-world assets
 *         (e.g. property deeds, unique artwork, collectibles).
 *         Transfers restricted to compliant addresses.
 */
contract PropertyNFT is ERC721, ERC721URIStorage, Ownable {
    ComplianceRegistry public complianceRegistry;

    uint256 private _nextTokenId;

    struct NFTMetadata {
        string assetType; // "property_deed", "artwork", "collectible"
        string location;
        uint256 valuationWei;
        uint256 mintedAt;
        string propertyId;
    }

    mapping(uint256 => NFTMetadata) public nftMetadata;
    mapping(string => uint256) public propertyToToken;
    mapping(string => bool) public propertyHasToken;

    event NFTMinted(
        uint256 indexed tokenId,
        address indexed to,
        string assetType,
        uint256 valuation
    );
    event NFTValuationUpdated(uint256 indexed tokenId, uint256 oldVal, uint256 newVal);

    constructor(
        string memory _name,
        string memory _symbol,
        address _complianceRegistry
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
    }

    /**
     * @notice Mint a new NFT representing a unique asset.
     */
    function mintAsset(
        address to,
        string memory uri,
        string memory assetType,
        string memory location,
        uint256 valuationWei,
        string memory propertyId
    ) external onlyOwner returns (uint256) {
        require(complianceRegistry.isCompliant(to), "Recipient not KYC compliant");

        // If propertyId is not empty, enforce uniqueness
        if (bytes(propertyId).length > 0) {
            require(!propertyHasToken[propertyId], "Property already has an NFT");
        }

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        nftMetadata[tokenId] = NFTMetadata({
            assetType: assetType,
            location: location,
            valuationWei: valuationWei,
            mintedAt: block.timestamp,
            propertyId: propertyId
        });

        if (bytes(propertyId).length > 0) {
            propertyToToken[propertyId] = tokenId;
            propertyHasToken[propertyId] = true;
        }

        emit NFTMinted(tokenId, to, assetType, valuationWei);
        return tokenId;
    }

    /**
     * @notice Update the valuation of an NFT (owner only).
     */
    function updateValuation(uint256 tokenId, uint256 newValuation) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        uint256 oldVal = nftMetadata[tokenId].valuationWei;
        nftMetadata[tokenId].valuationWei = newValuation;
        emit NFTValuationUpdated(tokenId, oldVal, newValuation);
    }

    /**
     * @notice Override transfer to enforce compliance.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721) returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from == address(0))
        if (from != address(0) && to != address(0)) {
            require(complianceRegistry.isCompliant(from), "Sender not KYC compliant");
            require(complianceRegistry.isCompliant(to), "Recipient not KYC compliant");
        }
        return super._update(to, tokenId, auth);
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // Required overrides
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
