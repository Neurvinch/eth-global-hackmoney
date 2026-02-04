// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Bol-DeFi ROSCA (Chit Fund) Contract
 * @dev Implements a decentralized Rotating Savings and Credit Association
 * where users contribute native currency (or USDC) and bid for the pot.
 */
contract ROSCA is Ownable {
    IERC20 public usdcToken;

    struct Group {
        string name;
        uint256 contributionAmount; // Fixed amount per member per cycle
        uint256 maxMembers;
        uint256 cycleDuration;     // In seconds (e.g., 7 days)
        uint256 currentCycle;      // Starts at 0
        uint256 totalPot;          // Accumulated in current cycle
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => bool) hasContributedInCurrentCycle;
        mapping(address => bool) hasWonPot; // Each member can only win once per tenure
        uint256 winningBid;        // Smallest discount bid wins (sequential bidding)
        address currentWinner;
        uint256 lastPayoutTime;
        bool isActive;
    }

    uint256 public groupCount;
    mapping(uint256 => Group) public groups;

    event GroupCreated(uint256 groupId, string name, uint256 contribution);
    event MemberJoined(uint256 groupId, address member);
    event ContributionMade(uint256 groupId, address member, uint256 amount);
    event PayoutDistributed(uint256 groupId, address winner, uint256 amount);

    constructor(address _usdcAddress) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
    }

    /**
     * @dev Create a new savings circle (ROSCA Group)
     */
    function createGroup(
        string memory _name,
        uint256 _contributionAmount,
        uint256 _maxMembers,
        uint256 _cycleDuration
    ) external {
        require(_maxMembers > 1, "Min 2 members required");
        
        groupCount++;
        Group storage g = groups[groupCount];
        g.name = _name;
        g.contributionAmount = _contributionAmount;
        g.maxMembers = _maxMembers;
        g.cycleDuration = _cycleDuration;
        g.isActive = true;
        g.lastPayoutTime = block.timestamp;

        emit GroupCreated(groupCount, _name, _contributionAmount);
    }

    /**
     * @dev Join an existing group before it starts
     */
    function joinGroup(uint256 _groupId) external {
        Group storage g = groups[_groupId];
        require(g.isActive, "Group not active");
        require(g.members.length < g.maxMembers, "Group full");
        require(!g.isMember[msg.sender], "Already a member");

        g.members.push(msg.sender);
        g.isMember[msg.sender] = true;

        emit MemberJoined(_groupId, msg.sender);
    }

    /**
     * @dev Contribute fixed amount for the current cycle
     * In production, this would use Arc / USDC transfer
     */
    function contribute(uint256 _groupId) external {
        Group storage g = groups[_groupId];
        require(g.isMember[msg.sender], "Not a member");
        require(!g.hasContributedInCurrentCycle[msg.sender], "Already contributed");

        // Logic for USDC transfer would go here
        // require(usdcToken.transferFrom(msg.sender, address(this), g.contributionAmount), "Transfer failed");

        g.hasContributedInCurrentCycle[msg.sender] = true;
        g.totalPot += g.contributionAmount;

        emit ContributionMade(_groupId, msg.sender, g.contributionAmount);
    }

    /**
     * @dev Simplified payout winner (Sequential in Phase 3, Bidding in later phases)
     */
    function payoutWinner(uint256 _groupId, address _winner) external onlyOwner {
        Group storage g = groups[_groupId];
        require(g.totalPot >= g.contributionAmount * g.members.length, "Pot incomplete");
        require(g.isMember[_winner], "Winner must be member");
        require(!g.hasWonPot[_winner], "Member already won pot");

        uint256 amountToPay = g.totalPot;
        g.totalPot = 0;
        g.hasWonPot[_winner] = true;
        
        // Reset contribution status for next cycle
        for (uint i = 0; i < g.members.length; i++) {
            g.hasContributedInCurrentCycle[g.members[i]] = false;
        }
        
        g.currentCycle++;
        g.lastPayoutTime = block.timestamp;

        // usdcToken.transfer(_winner, amountToPay);

        emit PayoutDistributed(_groupId, _winner, amountToPay);
    }
}
