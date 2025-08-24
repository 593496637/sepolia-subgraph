// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title SimpleTransferContract
 * @dev 演示 The Graph 事件索引的合约 - 修复版本
 */
contract SimpleTransferContract {
    
    // 定义转账记录事件
    event TransferRecord(
        address indexed from,      // 发送方（可查询）
        address indexed to,        // 接收方（可查询）
        uint256 value,            // 金额
        uint256 timestamp,        // 时间戳
        string message,           // 转账备注
        bytes32 recordId         // 记录ID
    );

    // 状态变量：记录总转账次数
    uint256 public totalRecords;
    
    // 映射：用户的转账记录数
    mapping(address => uint256) public userRecordCount;

    /**
     * @dev 记录转账信息（不涉及真实资产）
     * @param to 接收方地址
     * @param value 转账金额（演示用）
     * @param message 转账备注
     */
    function recordTransfer(
        address to, 
        uint256 value, 
        string memory message
    ) public {
        require(to != address(0), "Invalid recipient address");
        require(value > 0, "Value must be greater than 0");
        
        // 生成唯一的记录ID
        bytes32 recordId = keccak256(
            abi.encodePacked(
                msg.sender, 
                to, 
                value, 
                block.timestamp, 
                totalRecords
            )
        );
        
        // 更新状态
        totalRecords++;
        userRecordCount[msg.sender]++;
        
        // 触发事件（这是 The Graph 要索引的数据！）
        emit TransferRecord(
            msg.sender,
            to,
            value,
            block.timestamp,
            message,
            recordId
        );
    }

    /**
     * @dev 批量记录转账 - 修复版本
     * @param recipients 接收方地址数组
     * @param values 转账金额数组
     * @param messages 转账备注数组
     */
    function batchRecordTransfer(
        address[] calldata recipients,
        uint256[] calldata values,
        string[] calldata messages
    ) external {
        require(
            recipients.length == values.length && 
            values.length == messages.length, 
            "Arrays length mismatch"
        );
        
        for (uint i = 0; i < recipients.length; i++) {
            recordTransfer(recipients[i], values[i], messages[i]);
        }
    }

    /**
     * @dev 获取用户转账记录数
     */
    function getUserRecordCount(address user) external view returns (uint256) {
        return userRecordCount[user];
    }

    /**
     * @dev 获取合约基本信息
     */
    function getContractInfo() external view returns (
        uint256 _totalRecords,
        address _contractAddress,
        uint256 _blockNumber,
        uint256 _blockTimestamp
    ) {
        return (
            totalRecords,
            address(this),
            block.number,
            block.timestamp
        );
    }
}