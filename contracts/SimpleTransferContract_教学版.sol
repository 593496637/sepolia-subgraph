// SPDX-License-Identifier: MIT
// ↑ 这是版权声明，MIT是一种开源协议，表示代码可以自由使用

pragma solidity ^0.8.30;
// ↑ 指定Solidity编译器版本，^表示兼容0.8.30及以上版本（但小于0.9.0）

/**
 * @title SimpleTransferContract - 学习版智能合约
 * @dev 这是一个用于学习的智能合约，演示The Graph事件索引
 * 
 * 📚 核心概念学习：
 * 1. 智能合约 = 在区块链上运行的程序
 * 2. 事件 = 区块链上的"日志记录"，可以被外部程序监听
 * 3. 状态变量 = 永久存储在区块链上的数据
 * 4. 函数 = 合约中可以被调用的"方法"
 */
contract SimpleTransferContract {
    
    // ==================== 第一部分：事件定义 ====================
    
    /**
     * @dev 定义转账记录事件
     * 
     * 🎯 什么是事件(Event)？
     * - 事件是区块链上的"日志"，记录重要的操作
     * - 外部程序（如The Graph）可以监听这些事件
     * - 事件比存储数据便宜很多（省gas费）
     * 
     * 🔍 indexed关键字的作用：
     * - indexed参数可以被高效查询和筛选
     * - 例如：查询某个地址发送的所有转账记录
     * - 每个事件最多可以有3个indexed参数
     */
    event TransferRecord(
        address indexed from,      // 发送方地址（可查询筛选）
        address indexed to,        // 接收方地址（可查询筛选）  
        uint256 value,            // 转账金额（不可筛选，但包含在事件数据中）
        uint256 timestamp,        // 时间戳（区块被挖出的时间）
        string message,           // 转账备注信息
        bytes32 recordId         // 唯一记录ID
    );
    
    // ==================== 第二部分：状态变量 ====================
    
    /**
     * @dev 状态变量 - 永久存储在区块链上的数据
     * 
     * 🏦 什么是状态变量？
     * - 存储在区块链上，永久保存
     * - 修改状态变量需要花费gas费
     * - public关键字自动生成getter函数
     */
    
    // 记录总的转账记录数量
    uint256 public totalRecords;
    // ↑ uint256 = 无符号256位整数（0到2^256-1）
    // ↑ public = 外部可以读取这个变量的值
    
    // 记录每个用户的转账记录数量
    mapping(address => uint256) public userRecordCount;
    // ↑ mapping = 键值对映射，类似字典/Map
    // ↑ address = 以太坊地址类型（42位十六进制字符串）
    // ↑ 例如：userRecordCount[0x123...abc] = 5（表示该地址有5条记录）
    
    // 记录ID是否已存在（防止重复）
    mapping(bytes32 => bool) public recordExists;
    // ↑ bytes32 = 32字节的数据类型，常用于存储哈希值
    // ↑ bool = 布尔类型，true或false
    
    // ==================== 第三部分：自定义错误 ====================
    
    /**
     * @dev 自定义错误 - Solidity 0.8.4+的新特性
     * 
     * 💡 为什么使用自定义错误？
     * - 比require字符串错误节省约50%的gas费
     * - 错误信息更清晰和标准化
     * - 支持参数化错误信息
     */
    
    error InvalidRecipientAddress();  // 无效的接收地址错误
    error InvalidValue();            // 无效的金额错误  
    error ArrayLengthMismatch();     // 数组长度不匹配错误
    error RecordAlreadyExists();     // 记录已存在错误
    
    // ==================== 第四部分：主要函数 ====================
    
    /**
     * @dev 记录转账信息的主函数
     * 
     * 📝 函数解析：
     * - public: 可以被外部调用，也可以被内部调用
     * - returns: 声明函数返回值类型
     * - memory: 临时存储，函数执行完就销毁（相对便宜）
     * 
     * @param to 接收方地址
     * @param value 转账金额（以wei为单位，1 ETH = 10^18 wei）
     * @param message 转账备注信息
     * @return recordId 返回生成的记录ID
     */
    function recordTransfer(
        address to,              // 接收方地址参数
        uint256 value,           // 转账金额参数
        string memory message    // 转账备注参数
    ) public returns (bytes32 recordId) {
        
        // ---------- 第1步：输入验证 ----------
        
        /**
         * 🛡️ 安全检查 - 验证输入参数的有效性
         * 
         * address(0) = 0x0000...0000，空地址，不能作为有效接收方
         * revert = 立即停止执行并回滚所有状态改变
         */
        if (to == address(0)) revert InvalidRecipientAddress();
        if (value == 0) revert InvalidValue();
        
        // ---------- 第2步：生成唯一记录ID ----------
        
        /**
         * 🔐 生成唯一标识符
         * 
         * keccak256 = 以太坊使用的哈希函数，输入相同则输出相同
         * abi.encodePacked = 将多个值打包成字节数组
         * msg.sender = 调用此函数的地址（当前交易发起者）
         * block.timestamp = 当前区块的时间戳
         * blockhash(block.number - 1) = 前一个区块的哈希值（增加随机性）
         */
        recordId = keccak256(
            abi.encodePacked(
                msg.sender,                    // 发送方地址
                to,                           // 接收方地址
                value,                        // 转账金额
                block.timestamp,              // 当前时间戳
                totalRecords,                 // 当前记录总数
                blockhash(block.number - 1)   // 前一区块哈希（增加随机性）
            )
        );
        
        // 检查记录ID是否已存在（防止极小概率的哈希碰撞）
        if (recordExists[recordId]) revert RecordAlreadyExists();
        
        // ---------- 第3步：更新状态变量 ----------
        
        /**
         * ⚡ unchecked块 - Gas优化技巧
         * 
         * 正常情况下，Solidity会自动检查数学运算是否溢出
         * 当我们确定不会溢出时，可以使用unchecked跳过检查，节省gas
         * 
         * 这里安全的原因：
         * - totalRecords从0开始递增，在实际使用中不可能溢出uint256
         * - userRecordCount同理
         */
        unchecked {
            totalRecords++;                    // 总记录数+1
            userRecordCount[msg.sender]++;     // 发送方的记录数+1
        }
        
        // 标记这个记录ID已被使用
        recordExists[recordId] = true;
        
        // ---------- 第4步：触发事件 ----------
        
        /**
         * 📢 触发事件 - 这是The Graph要监听的重点！
         * 
         * emit = 触发事件的关键字
         * 这个事件会被记录在区块链上，The Graph可以监听并建立索引
         * 外部程序可以通过事件查询所有转账记录
         */
        emit TransferRecord(
            msg.sender,        // 发送方（当前调用者）
            to,               // 接收方
            value,            // 转账金额
            block.timestamp,  // 时间戳
            message,          // 备注信息
            recordId          // 记录ID
        );
        
        // ---------- 第5步：返回结果 ----------
        
        // 返回生成的记录ID，调用方可以用来追踪这次操作
        return recordId;
    }
    
    /**
     * @dev 批量记录转账 - 演示数组操作和循环
     * 
     * 📊 数组参数说明：
     * - calldata: 只读的参数存储位置，比memory更省gas
     * - 数组长度必须一致：recipients[0]对应values[0]对应messages[0]
     * 
     * @param recipients 接收方地址数组
     * @param values 转账金额数组  
     * @param messages 转账备注数组
     * @return recordIds 返回所有生成的记录ID数组
     */
    function batchRecordTransfer(
        address[] calldata recipients,   // 接收方地址数组
        uint256[] calldata values,       // 转账金额数组
        string[] calldata messages      // 转账备注数组
    ) external returns (bytes32[] memory recordIds) {
        // ↑ external: 只能被外部调用，比public稍微省一点gas
        // ↑ memory: 返回值在内存中临时创建
        
        // 获取数组长度
        uint256 length = recipients.length;
        
        // 验证所有数组长度必须相同
        if (length != values.length || length != messages.length) {
            revert ArrayLengthMismatch();
        }
        
        // 创建返回结果数组
        recordIds = new bytes32[](length);
        // ↑ new = 创建新的数组，长度为length
        
        /**
         * 🔄 循环处理每个转账记录
         * 
         * for循环语法：for(初始化; 条件; 递增)
         * 这里使用unchecked优化递增操作
         */
        for (uint256 i = 0; i < length;) {
            // 调用单个转账记录函数
            recordIds[i] = recordTransfer(
                recipients[i],    // 第i个接收方
                values[i],       // 第i个金额
                messages[i]      // 第i个备注
            );
            
            /**
             * ⚡ 循环优化技巧
             * 
             * 正常写法：i++
             * 优化写法：unchecked { i++; }
             * 
             * 因为我们知道i不会溢出（受length限制），所以跳过溢出检查
             */
            unchecked { 
                i++; 
            }
        }
        
        // 返回所有记录ID
        return recordIds;
    }
    
    // ==================== 第五部分：查询函数 ====================
    
    /**
     * @dev 获取用户的转账记录数
     * 
     * 🔍 view函数说明：
     * - view: 只读函数，不修改状态，不消耗gas（除非在交易中调用）
     * - external: 只能外部调用
     * 
     * @param user 要查询的用户地址
     * @return count 该用户的记录数量
     */
    function getUserRecordCount(address user) external view returns (uint256 count) {
        return userRecordCount[user];
        // 直接返回mapping中存储的值
    }
    
    /**
     * @dev 检查某个记录ID是否已存在
     * 
     * @param recordId 要检查的记录ID
     * @return exists 记录是否存在
     */
    function isRecordExists(bytes32 recordId) external view returns (bool exists) {
        return recordExists[recordId];
    }
    
    /**
     * @dev 获取合约的基本信息
     * 
     * 📈 多返回值函数：
     * - 可以返回多个值
     * - 调用时可以解构：(total, addr, block, time) = getContractInfo()
     * 
     * @return _totalRecords 总记录数
     * @return _contractAddress 合约地址
     * @return _blockNumber 当前区块号
     * @return _blockTimestamp 当前区块时间戳
     */
    function getContractInfo() external view returns (
        uint256 _totalRecords,      // 总记录数
        address _contractAddress,   // 合约地址
        uint256 _blockNumber,      // 当前区块号
        uint256 _blockTimestamp    // 当前区块时间戳
    ) {
        return (
            totalRecords,           // 返回状态变量
            address(this),         // address(this) = 当前合约地址
            block.number,          // 当前区块号
            block.timestamp        // 当前区块时间戳（Unix时间戳）
        );
    }
    
    /**
     * @dev 获取区块链相关信息 - 学习区块链概念
     * 
     * 🌐 区块链基础概念：
     * - block.number: 当前区块号（从0开始递增）
     * - blockhash(): 指定区块的哈希值
     * - block.prevrandao: 前一个区块的随机数（用于随机性）
     * 
     * @return currentBlock 当前区块号
     * @return prevBlockHash 前一个区块的哈希值
     * @return randomness 随机数值（在PoS中用于随机性）
     */
    function getBlockInfo() external view returns (
        uint256 currentBlock,
        bytes32 prevBlockHash,  
        uint256 randomness
    ) {
        return (
            block.number,                    // 当前区块号
            blockhash(block.number - 1),    // 前一个区块的哈希
            block.prevrandao                // 随机数（0.8.18+版本特性）
        );
        // 注意：block.prevrandao在0.8.18+版本中替代了block.difficulty
    }
    
    // ==================== 第六部分：学习总结 ====================
    
    /**
     * 🎓 通过这个合约，您学到了：
     * 
     * 1. **基本语法**：
     *    - pragma, contract, function, mapping, array
     *    - public, private, external, view
     *    - memory, storage, calldata
     * 
     * 2. **数据类型**：
     *    - address: 以太坊地址
     *    - uint256: 无符号整数
     *    - bytes32: 32字节数据
     *    - bool: 布尔值
     *    - string: 字符串
     *    - mapping: 键值对映射
     * 
     * 3. **重要概念**：
     *    - 事件(Events): 区块链日志
     *    - 状态变量: 永久存储
     *    - Gas优化: unchecked, custom errors
     *    - 安全检查: 输入验证, 溢出保护
     * 
     * 4. **区块链特性**：
     *    - msg.sender: 交易发起者
     *    - block.timestamp: 区块时间
     *    - block.number: 区块号
     *    - 哈希函数: keccak256
     * 
     * 5. **The Graph集成**：
     *    - 事件是数据索引的基础
     *    - indexed参数支持高效查询
     *    - 合约事件 → The Graph → GraphQL API
     */
}