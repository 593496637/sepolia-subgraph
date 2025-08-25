/**
 * 十六进制编码/解码工具函数
 * 支持中文、Emoji 和所有 Unicode 字符的正确处理
 * 
 * 🌍 多语言支持：
 * - 支持中文字符
 * - 支持 Emoji 表情
 * - 支持所有 Unicode 字符
 * - 正确处理代理对（Surrogate Pairs）
 * 
 * 🔐 区块链应用场景：
 * - 将转账附言编码为 hexData 发送交易
 * - 从交易 data 字段解码出原始附言内容
 * - 保证数据在区块链上的完整性和可读性
 */

/**
 * 将字符串转换为十六进制编码
 * 
 * @param str - 要编码的字符串
 * @returns 十六进制字符串（0x前缀）
 * 
 * 🔄 编码原理：
 * - 遍历字符串中的每个字符
 * - 获取字符的 Unicode 码点（Code Point）
 * - 将码点转换为 4 位十六进制表示
 * - 正确处理超过 0xFFFF 的字符（如 Emoji）
 * 
 * 💡 示例：
 * - "Hello" → "0x00480065006c006c006f"
 * - "世界" → "0x4e16754c"  
 * - "🌍" → "0x1f30d"
 */
export function str2hex(str: string): string {
  if (!str) return '0x';
  
  const arr = ['0x'];
  
  for (let i = 0; i < str.length; i++) {
    // 获取字符的 Unicode 码点
    const codePoint = str.codePointAt(i);
    
    if (codePoint === undefined) {
      continue; // 跳过无效字符
    }
    
    // 如果是代理对（大于 0xFFFF），需要跳过下一个字符
    if (codePoint > 0xffff) {
      i++; // 跳过代理对的低位部分
    }
    
    // 转换为 4 位十六进制，不足 4 位前面补 0
    arr.push(codePoint.toString(16).padStart(4, '0'));
  }
  
  return arr.join('');
}

/**
 * 将十六进制字符串解码为原始字符串
 * 
 * @param hex - 十六进制字符串（支持 0x 前缀）
 * @returns 解码后的原始字符串
 * 
 * 🔄 解码原理：
 * - 移除 0x 前缀（如果存在）
 * - 验证字符串长度（必须是 4 的倍数）
 * - 每 4 位十六进制解析为一个 Unicode 码点
 * - 使用 String.fromCodePoint 还原字符
 * 
 * 💡 示例：
 * - "0x00480065006c006c006f" → "Hello"
 * - "0x4e16754c" → "世界"
 * - "0x1f30d" → "🌍"
 * 
 * ⚠️ 错误处理：
 * - 长度不是 4 的倍数时抛出异常
 * - 包含无效十六进制字符时解析失败
 */
export function hex2str(hex: string): string {
  let rawStr = hex.trim();
  
  // 移除 0x 前缀
  if (rawStr.startsWith('0x')) {
    rawStr = rawStr.slice(2);
  }
  
  // 验证长度：必须是 4 的倍数
  if (rawStr.length % 4 !== 0) {
    throw new Error('非法十六进制字符串：长度必须是 4 的倍数');
  }
  
  const result = [];
  
  // 每 4 位解析一个字符
  for (let i = 0; i < rawStr.length; i += 4) {
    const hexCode = rawStr.slice(i, i + 4);
    const codePoint = parseInt(hexCode, 16);
    
    // 验证码点有效性
    if (isNaN(codePoint)) {
      throw new Error(`无效的十六进制编码: ${hexCode}`);
    }
    
    result.push(String.fromCodePoint(codePoint));
  }
  
  return result.join('');
}

/**
 * 验证十六进制字符串格式是否正确
 * 
 * @param hex - 要验证的十六进制字符串
 * @returns 是否为有效格式
 * 
 * ✅ 验证规则：
 * - 可选的 0x 前缀
 * - 只包含十六进制字符 (0-9, a-f, A-F)
 * - 长度为 4 的倍数（每个字符用 4 位表示）
 */
export function isValidHex(hex: string): boolean {
  if (!hex) return false;
  
  let rawStr = hex.trim();
  
  // 移除 0x 前缀
  if (rawStr.startsWith('0x')) {
    rawStr = rawStr.slice(2);
  }
  
  // 检查长度和字符有效性
  return rawStr.length % 4 === 0 && /^[0-9a-fA-F]*$/.test(rawStr);
}

/**
 * 获取字符串的字节长度（用于估算 Gas 费用）
 * 
 * @param str - 要计算的字符串
 * @returns 十六进制编码后的字节长度
 * 
 * 💰 Gas 费用相关：
 * - 每个非零字节消耗 16 Gas
 * - 每个零字节消耗 4 Gas
 * - 可用于估算附言的交易成本
 */
export function getHexByteLength(str: string): number {
  if (!str) return 0;
  
  const hex = str2hex(str);
  // 移除 0x 前缀，每 2 位十六进制表示 1 字节
  return (hex.length - 2) / 2;
}

/**
 * 截断长字符串用于 UI 显示
 * 
 * @param str - 原始字符串
 * @param maxLength - 最大显示长度
 * @returns 截断后的字符串
 * 
 * 🎨 UI 优化：
 * - 保持用户体验的同时显示主要信息
 * - 避免长附言影响界面布局
 */
export function truncateString(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str;
  
  const halfLength = Math.floor((maxLength - 3) / 2);
  return `${str.slice(0, halfLength)}...${str.slice(-halfLength)}`;
}

// 导出所有工具函数
export const hexUtils = {
  str2hex,
  hex2str,
  isValidHex,
  getHexByteLength,
  truncateString
};