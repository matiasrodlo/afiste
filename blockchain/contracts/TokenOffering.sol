// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./VCToken.sol";

/**
 * @title TokenOffering
 * @dev Manages initial token offerings for VC funds
 * @notice Handles offering lifecycle, purchases, and allocations
 */
contract TokenOffering is AccessControl, Ownable, ReentrancyGuard {
    using Address for address payable;

    // Roles
    bytes32 public constant OFFERING_ADMIN_ROLE = keccak256("OFFERING_ADMIN_ROLE");

    // Offering status enum
    enum OfferingStatus {
        Upcoming,
        Active,
        Paused,
        Completed,
        Cancelled
    }

    // Offering structure
    struct Offering {
        uint256 id;
        address vcToken; // VCToken contract address
        uint256 offeringPrice; // Price per token in wei
        uint256 minInvestment; // Minimum investment amount
        uint256 maxInvestment; // Maximum investment amount (0 = no limit)
        uint256 totalTokensOffered; // Total tokens available
        uint256 tokensSold; // Tokens sold so far
        uint256 startDate; // Unix timestamp
        uint256 endDate; // Unix timestamp (0 = no end date)
        OfferingStatus status;
        bool whitelistRequired; // Whether whitelist is required
        mapping(address => bool) whitelist; // Whitelist for this offering
        mapping(address => uint256) purchases; // User purchases
    }

    // Offerings mapping
    mapping(uint256 => Offering) public offerings;
    uint256 public offeringCount;

    // Events
    event OfferingCreated(
        uint256 indexed offeringId,
        address indexed vcToken,
        uint256 offeringPrice,
        uint256 totalTokensOffered
    );
    event OfferingStatusUpdated(uint256 indexed offeringId, OfferingStatus status);
    event TokensPurchased(
        uint256 indexed offeringId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPaid
    );
    event WhitelistUpdated(uint256 indexed offeringId, address indexed account, bool whitelisted);
    event OfferingCancelled(uint256 indexed offeringId);

    /**
     * @dev Constructor
     * @param initialOwner Owner address
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(OFFERING_ADMIN_ROLE, initialOwner);
    }

    /**
     * @dev Create a new token offering
     * @param vcToken VCToken contract address
     * @param offeringPrice Price per token in wei
     * @param minInvestment Minimum investment amount
     * @param maxInvestment Maximum investment amount (0 = no limit)
     * @param totalTokensOffered Total tokens to offer
     * @param startDate Start timestamp
     * @param endDate End timestamp (0 = no end date)
     * @param whitelistRequired Whether whitelist is required
     * @return offeringId The ID of the created offering
     */
    function createOffering(
        address vcToken,
        uint256 offeringPrice,
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 totalTokensOffered,
        uint256 startDate,
        uint256 endDate,
        bool whitelistRequired
    ) public onlyRole(OFFERING_ADMIN_ROLE) returns (uint256) {
        require(vcToken != address(0), "TokenOffering: invalid token address");
        require(offeringPrice > 0, "TokenOffering: price must be greater than 0");
        require(minInvestment > 0, "TokenOffering: min investment must be greater than 0");
        require(totalTokensOffered > 0, "TokenOffering: tokens offered must be greater than 0");
        require(
            endDate == 0 || endDate > startDate,
            "TokenOffering: end date must be after start date"
        );

        uint256 offeringId = offeringCount++;
        Offering storage offering = offerings[offeringId];

        offering.id = offeringId;
        offering.vcToken = vcToken;
        offering.offeringPrice = offeringPrice;
        offering.minInvestment = minInvestment;
        offering.maxInvestment = maxInvestment;
        offering.totalTokensOffered = totalTokensOffered;
        offering.tokensSold = 0;
        offering.startDate = startDate;
        offering.endDate = endDate;
        offering.status = OfferingStatus.Upcoming;
        offering.whitelistRequired = whitelistRequired;

        emit OfferingCreated(offeringId, vcToken, offeringPrice, totalTokensOffered);

        return offeringId;
    }

    /**
     * @dev Purchase tokens from an offering
     * @param offeringId Offering ID
     * @param tokenAmount Amount of tokens to purchase
     */
    function purchaseTokens(
        uint256 offeringId,
        uint256 tokenAmount
    ) public payable nonReentrant {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");
        require(
            offering.status == OfferingStatus.Active,
            "TokenOffering: offering is not active"
        );
        require(
            block.timestamp >= offering.startDate,
            "TokenOffering: offering has not started"
        );
        require(
            offering.endDate == 0 || block.timestamp <= offering.endDate,
            "TokenOffering: offering has ended"
        );
        require(
            offering.tokensSold + tokenAmount <= offering.totalTokensOffered,
            "TokenOffering: insufficient tokens available"
        );

        // Check whitelist if required
        if (offering.whitelistRequired) {
            require(offering.whitelist[msg.sender], "TokenOffering: not whitelisted");
        }

        // Calculate total payment required
        uint256 totalPayment = tokenAmount * offering.offeringPrice;
        require(msg.value >= totalPayment, "TokenOffering: insufficient payment");

        // Check investment limits
        uint256 userTotalInvestment = offering.purchases[msg.sender] + totalPayment;
        require(
            userTotalInvestment >= offering.minInvestment,
            "TokenOffering: below minimum investment"
        );
        if (offering.maxInvestment > 0) {
            require(
                userTotalInvestment <= offering.maxInvestment,
                "TokenOffering: exceeds maximum investment"
            );
        }

        // Update offering state
        offering.tokensSold += tokenAmount;
        offering.purchases[msg.sender] += totalPayment;

        // Transfer tokens to buyer
        VCToken vcToken = VCToken(offering.vcToken);
        vcToken.mint(msg.sender, tokenAmount);

        // Refund excess payment
        if (msg.value > totalPayment) {
            payable(msg.sender).sendValue(msg.value - totalPayment);
        }

        emit TokensPurchased(offeringId, msg.sender, tokenAmount, totalPayment);

        // Check if offering is completed
        if (offering.tokensSold >= offering.totalTokensOffered) {
            offering.status = OfferingStatus.Completed;
            emit OfferingStatusUpdated(offeringId, OfferingStatus.Completed);
        }
    }

    /**
     * @dev Update offering status
     * @param offeringId Offering ID
     * @param newStatus New status
     */
    function updateOfferingStatus(
        uint256 offeringId,
        OfferingStatus newStatus
    ) public onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        offering.status = newStatus;
        emit OfferingStatusUpdated(offeringId, newStatus);
    }

    /**
     * @dev Add address to offering whitelist
     * @param offeringId Offering ID
     * @param account Address to whitelist
     */
    function addToWhitelist(
        uint256 offeringId,
        address account
    ) public onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        offering.whitelist[account] = true;
        emit WhitelistUpdated(offeringId, account, true);
    }

    /**
     * @dev Remove address from offering whitelist
     * @param offeringId Offering ID
     * @param account Address to remove
     */
    function removeFromWhitelist(
        uint256 offeringId,
        address account
    ) public onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        offering.whitelist[account] = false;
        emit WhitelistUpdated(offeringId, account, false);
    }

    /**
     * @dev Batch add addresses to whitelist
     * @param offeringId Offering ID
     * @param accounts Array of addresses
     */
    function batchAddToWhitelist(
        uint256 offeringId,
        address[] memory accounts
    ) public onlyRole(OFFERING_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            addToWhitelist(offeringId, accounts[i]);
        }
    }

    /**
     * @dev Cancel an offering
     * @param offeringId Offering ID
     */
    function cancelOffering(uint256 offeringId) public onlyRole(OFFERING_ADMIN_ROLE) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");
        require(
            offering.status != OfferingStatus.Completed,
            "TokenOffering: cannot cancel completed offering"
        );

        offering.status = OfferingStatus.Cancelled;
        emit OfferingCancelled(offeringId);
        emit OfferingStatusUpdated(offeringId, OfferingStatus.Cancelled);
    }

    /**
     * @dev Get offering details
     * @param offeringId Offering ID
     * @return vcToken Token address
     * @return offeringPrice Price per token
     * @return minInvestment Minimum investment
     * @return maxInvestment Maximum investment
     * @return totalTokensOffered Total tokens offered
     * @return tokensSold Tokens sold
     * @return startDate Start timestamp
     * @return endDate End timestamp
     * @return status Current status
     * @return whitelistRequired Whether whitelist is required
     */
    function getOffering(
        uint256 offeringId
    )
        public
        view
        returns (
            address vcToken,
            uint256 offeringPrice,
            uint256 minInvestment,
            uint256 maxInvestment,
            uint256 totalTokensOffered,
            uint256 tokensSold,
            uint256 startDate,
            uint256 endDate,
            OfferingStatus status,
            bool whitelistRequired
        )
    {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        return (
            offering.vcToken,
            offering.offeringPrice,
            offering.minInvestment,
            offering.maxInvestment,
            offering.totalTokensOffered,
            offering.tokensSold,
            offering.startDate,
            offering.endDate,
            offering.status,
            offering.whitelistRequired
        );
    }

    /**
     * @dev Get user purchase amount for an offering
     * @param offeringId Offering ID
     * @param user User address
     * @return amount Total amount purchased
     */
    function getUserPurchase(
        uint256 offeringId,
        address user
    ) public view returns (uint256) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        return offering.purchases[user];
    }

    /**
     * @dev Check if user is whitelisted for an offering
     * @param offeringId Offering ID
     * @param account User address
     * @return bool Whether user is whitelisted
     */
    function isWhitelisted(
        uint256 offeringId,
        address account
    ) public view returns (bool) {
        Offering storage offering = offerings[offeringId];
        require(offering.id == offeringId, "TokenOffering: offering does not exist");

        return offering.whitelist[account];
    }

    /**
     * @dev Withdraw funds from contract (only owner)
     */
    function withdraw() public onlyOwner {
        payable(owner()).sendValue(address(this).balance);
    }
}

