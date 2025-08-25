#!/usr/bin/env node

/**
 * Fix schema.ts assert issue
 * 
 * 🎯 功能说明：
 * - 自动修复 graph codegen 生成的 schema.ts 中缺少 assert 声明的问题
 * - 在文件开头添加 AssemblyScript 全局函数声明
 * - 确保 The Graph 编译可以成功完成
 * 
 * 📋 问题背景：
 * - The Graph 代码生成器生成的 schema.ts 使用了 assert() 函数
 * - 但没有导入或声明 assert 函数
 * - AssemblyScript 中 assert 是全局函数，需要显式声明
 * 
 * 🔧 解决方案：
 * - 检查 generated/schema.ts 是否包含 assert 声明
 * - 如果没有，则在适当位置添加声明
 * - 保持文件的其余部分不变
 * 
 * 💡 使用方法：
 * - 在 package.json 中添加 postcodegen 脚本
 * - 每次运行 graph codegen 后自动执行此修复
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_FILE_PATH = path.join(__dirname, 'generated', 'schema.ts');
const ASSERT_DECLARATION = '// Global AssemblyScript functions declaration\ndeclare function assert(condition: boolean, message?: string): void;\n\n';

function fixSchemaAssert() {
  console.log('🔧 检查并修复 schema.ts 中的 assert 声明...');
  
  // 检查文件是否存在
  if (!fs.existsSync(SCHEMA_FILE_PATH)) {
    console.log('❌ schema.ts 文件不存在，跳过修复');
    return;
  }
  
  // 读取文件内容
  let content = fs.readFileSync(SCHEMA_FILE_PATH, 'utf8');
  
  // 检查是否已经包含 assert 声明
  if (content.includes('declare function assert')) {
    console.log('✅ schema.ts 已包含 assert 声明，无需修复');
    return;
  }
  
  // 找到第一个 import 语句的位置
  const importMatch = content.match(/^import\s*\{/m);
  if (!importMatch) {
    console.log('❌ 未找到 import 语句，无法确定插入位置');
    return;
  }
  
  const importIndex = importMatch.index;
  
  // 在 import 语句前插入 assert 声明
  const before = content.substring(0, importIndex);
  const after = content.substring(importIndex);
  
  // 构建新的内容
  const newContent = before + ASSERT_DECLARATION + after;
  
  // 写回文件
  fs.writeFileSync(SCHEMA_FILE_PATH, newContent, 'utf8');
  
  console.log('✅ 成功修复 schema.ts 中的 assert 声明问题');
}

// 执行修复
try {
  fixSchemaAssert();
} catch (error) {
  console.error('❌ 修复过程中出现错误:', error.message);
  process.exit(1);
}