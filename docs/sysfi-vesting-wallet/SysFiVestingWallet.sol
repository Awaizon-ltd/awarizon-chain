// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

contract SysFiVestingWallet {
    address public beneficiary;
    uint64 public start;
    uint64 public duration;
    uint256 public released;

    event Released(uint256 amount);

    constructor(address beneficiary_, uint64 start_, uint64 duration_) {
        beneficiary = beneficiary_;
        start = start_;
        duration = duration_;
    }

    receive() external payable {}

    function vestedAmount(uint64 timestamp) public view returns (uint256) {
        uint256 totalAllocation = address(this).balance + released;
        if (timestamp < start) {
            return 0;
        } else if (timestamp >= start + duration) {
            return totalAllocation;
        } else {
            return (totalAllocation * (timestamp - start)) / duration;
        }
    }

    function releasable() public view returns (uint256) {
        return vestedAmount(uint64(block.timestamp)) - released;
    }

    function release() public {
        uint256 amount = releasable();
        require(amount > 0, "SysFiVestingWallet: nothing to release");
        released += amount;
        (bool ok, ) = payable(beneficiary).call{value: amount}("");
        require(ok, "SysFiVestingWallet: transfer failed");
        emit Released(amount);
    }
}
