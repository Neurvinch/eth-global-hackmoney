// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Bol-DeFi Premium ROSCO (Auction-based Chit Fund)
 * @author Senior Blockchain Architect
 * @dev Implements a robust auction-based decentralized savings circle.
 */
contract ROSCA is Ownable, ReentrancyGuard {
    IERC20 public immutable usdcToken;
    
    uint256 public platformFeeBps = 100; // 1% default fee (Basis points)
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct Group {
        string name;
        uint256 contributionAmount; // Fixed amount per member
        uint256 maxMembers;
        uint256 cycleDuration;     // seconds (e.g., 30 days)
        uint256 auctionDuration;   // seconds (e.g., 2 days)
        uint256 minDefaultDiscount; // Fixed amount used if no one bids
        
        uint256 currentCycle;      // Index of current rotation
        uint256 cycleStartTime;    // Timestamp when current cycle started
        uint256 totalEscrow;       // Total USDC locked in current cycle
        
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => bool) hasWon;
        mapping(address => bool) hasContributedInCycle;
        
        // Auction state
        address highestBidder;
        uint256 highestDiscount;   // The discount the bidder is offering (₹1500 in user's example)
        bool auctionSettled;
    }

    uint256 public groupCount;
    mapping(uint256 => Group) public groups;
    
    // Member dividends (undrawn discount distributions)
    mapping(address => uint256) public userBalance;

    event GroupStarted(uint256 indexed groupId, string name);
    event ContributionDeposited(uint256 indexed groupId, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed groupId, address indexed bidder, uint256 discount);
    event AuctionWinnerSelected(uint256 indexed groupId, address winner, uint256 payout, uint256 dividendPerMember);
    event DividendWithdrawn(address indexed member, uint256 amount);

    constructor(address _usdcAddress) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
    }

    // --- Admin Configuration ---

    function setPlatformFee(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 1000, "Fee too high"); // Max 10%
        platformFeeBps = _newFeeBps;
    }

    // --- Core ROSCA Functions ---

    /**
     * @dev Create a new group with specific auction and duration parameters.
     */
    function createGroup(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers,
        uint256 _cycleDuration,
        uint256 _auctionDuration,
        uint256 _minDefaultDiscount
    ) external nonReentrant {
        require(_maxMembers >= 2, "Min 2 members");
        require(_auctionDuration < _cycleDuration, "Auction too long");
        require(_minDefaultDiscount < (_contributionAmount * _maxMembers), "Invalid discount");

        groupCount++;
        Group storage g = groups[groupCount];
        g.name = _name;
        g.contributionAmount = _contributionAmount;
        g.maxMembers = _maxMembers;
        g.cycleDuration = _cycleDuration;
        g.auctionDuration = _auctionDuration;
        g.minDefaultDiscount = _minDefaultDiscount;
        g.cycleStartTime = block.timestamp;
        g.isActive = true;

        emit GroupStarted(groupCount, _name);
    }

    /**
     * @dev Join a group while it's in the formation phase.
     */
    function joinGroup(uint256 _groupId) external nonReentrant {
        Group storage g = groups[_groupId];
        require(g.members.length < g.maxMembers, "Full");
        require(!g.isMember[msg.sender], "Already in");

        g.members.push(msg.sender);
        g.isMember[msg.sender] = true;
    }

    /**
     * @dev Escrow monthly contribution.
     */
    function depositContribution(uint256 _groupId) external nonReentrant {
        Group storage g = groups[_groupId];
        require(g.isMember[msg.sender], "Not member");
        require(!g.hasContributedInCycle[msg.sender], "Already paid");

        // Transfer USDC to contract
        require(usdcToken.transferFrom(msg.sender, address(this), g.contributionAmount), "USDC fail");

        g.hasContributedInCycle[msg.sender] = true;
        g.totalEscrow += g.contributionAmount;

        emit ContributionDeposited(_groupId, msg.sender, g.contributionAmount);
    }

    /**
     * @dev Place a bid during the auction window.
     * Members bid by offering a "Discount Amount".
     */
    function placeBid(uint256 _groupId, uint256 _discountAmount) external {
        Group storage g = groups[_groupId];
        require(g.isMember[msg.sender], "Not member");
        require(!g.hasWon[msg.sender], "Already won previously");
        require(block.timestamp < g.cycleStartTime + g.auctionDuration, "Auction closed");
        require(_discountAmount > g.highestDiscount, "Increase discount");
        require(_discountAmount >= g.minDefaultDiscount, "Below min discount");

        g.highestDiscount = _discountAmount;
        g.highestBidder = msg.sender;

        emit BidPlaced(_groupId, msg.sender, _discountAmount);
    }

    /**
     * @dev Settle the auction and distribute the pot.
     * Can be called by anyone once the auction window closes.
     */
    function settleAuction(uint256 _groupId) external nonReentrant {
        Group storage g = groups[_groupId];
        require(block.timestamp >= g.cycleStartTime + g.auctionDuration, "Auction ongoing");
        require(!g.auctionSettled, "Settled");
        
        // Ensure all members contributed (Simplification: In prod, apply penalties)
        require(g.totalEscrow >= g.contributionAmount * g.members.length, "Contributions pending");

        address winner;
        uint256 winningDiscount;

        if (g.highestBidder == address(0)) {
            // No bids: Pick first eligible member and apply default discount
            winner = _findNextEligibleWinner(_groupId);
            winningDiscount = g.minDefaultDiscount;
        } else {
            winner = g.highestBidder;
            winningDiscount = g.highestDiscount;
        }

        // Calculations
        uint256 platformFee = (winningDiscount * platformFeeBps) / BPS_DENOMINATOR;
        uint256 distributableDiscount = winningDiscount - platformFee;
        uint256 payout = (g.contributionAmount * g.members.length) - winningDiscount;
        
        // Winner gets the pot minus their discount
        require(usdcToken.transfer(winner, payout), "Payout fail");
        
        // Distribute remaining discount among non-winning members
        uint256 dividendPerMember = distributableDiscount / (g.members.length - 1);
        for (uint i = 0; i < g.members.length; i++) {
            if (g.members[i] != winner) {
                userBalance[g.members[i]] += dividendPerMember;
            }
        }

        // Update state for next cycle
        g.hasWon[winner] = true;
        g.auctionSettled = true;
        g.currentCycle++;
        
        // Prepare for next cycle start (Manual reset for simplicity)
        _resetCycle(_groupId);

        emit AuctionWinnerSelected(_groupId, winner, payout, dividendPerMember);
    }

    function withdrawDividends() external nonReentrant {
        uint256 amount = userBalance[msg.sender];
        require(amount > 0, "No balance");
        userBalance[msg.sender] = 0;
        require(usdcToken.transfer(msg.sender, amount), "Withdraw fail");
        emit DividendWithdrawn(msg.sender, amount);
    }

    // --- Internal Helpers ---

    function _findNextEligibleWinner(uint256 _groupId) internal view returns (address) {
        Group storage g = groups[_groupId];
        for (uint i = 0; i < g.members.length; i++) {
            if (!g.hasWon[g.members[i]]) return g.members[i];
        }
        return g.members[0]; // Fallback
    }

    function _resetCycle(uint256 _groupId) internal {
        Group storage g = groups[_groupId];
        g.cycleStartTime = block.timestamp;
        g.highestBidder = address(0);
        g.highestDiscount = 0;
        g.totalEscrow = 0;
        g.auctionSettled = false;
        for (uint i = 0; i < g.members.length; i++) {
            g.hasContributedInCycle[g.members[i]] = false;
        }
    }
}
