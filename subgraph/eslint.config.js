// ESLint 配置文件 - The Graph Subgraph 项目专用
// 🎯 目标：确保 AssemblyScript/TypeScript 代码质量和一致性
// 📋 功能：语法检查、代码风格、潜在错误检测

import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // 基础 JavaScript 推荐规则
  js.configs.recommended,
  
  {
    // 文件匹配模式 - 只检查 TypeScript 和 JavaScript 文件
    files: ['**/*.ts', '**/*.js'],
    
    // 忽略的文件和目录
    ignores: [
      'build/**',           // 编译输出目录
      'generated/**',       // Graph 生成的类型文件
      'node_modules/**',    // 依赖包目录
      '*.config.js',        // 配置文件（如果不需要检查）
    ],
    
    // 语言选项配置
    languageOptions: {
      // 使用 TypeScript 解析器
      parser: typescriptParser,
      
      // 解析器选项
      parserOptions: {
        ecmaVersion: 2022,        // 支持的 ECMAScript 版本
        sourceType: 'module',     // 使用 ES 模块
        project: null,            // 不使用 TypeScript 项目配置（AssemblyScript 特殊情况）
      },
      
      // 全局变量定义 - The Graph 特有的全局变量
      globals: {
        // AssemblyScript 全局变量
        'BigInt': 'readonly',
        'BigDecimal': 'readonly',
        'Address': 'readonly',
        'Bytes': 'readonly',
        'log': 'readonly',
        'ethereum': 'readonly',
        
        // Node.js 环境变量
        'console': 'readonly',
        'process': 'readonly',
        'Buffer': 'readonly',
        'global': 'readonly',
      }
    },
    
    // 使用的插件
    plugins: {
      '@typescript-eslint': typescript,
    },
    
    // 规则配置
    rules: {
      // ==================== 基础语法规则 ====================
      
      // 禁止使用未声明的变量
      'no-undef': 'error',
      
      // 禁止未使用的变量（警告级别，便于开发）
      'no-unused-vars': 'warn',
      
      // 禁止重复声明变量
      'no-redeclare': 'error',
      
      // 禁止不必要的分号
      'no-extra-semi': 'error',
      
      // 要求使用 === 而不是 ==
      'eqeqeq': ['error', 'always'],
      
      // ==================== TypeScript 特定规则 ====================
      
      // 禁止使用 any 类型（在 AssemblyScript 中很重要）
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // 要求函数返回类型注解（AssemblyScript 要求）
      '@typescript-eslint/explicit-function-return-type': 'warn',
      
      // 禁止未使用的变量（TypeScript 版本）
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',  // 忽略以下划线开头的参数
        'varsIgnorePattern': '^_'   // 忽略以下划线开头的变量
      }],
      
      // AssemblyScript 不支持 import type，关闭此规则
      '@typescript-eslint/consistent-type-imports': 'off',
      
      // ==================== 代码风格规则 ====================
      
      // 缩进规则（2个空格）
      'indent': ['error', 2, { 
        'SwitchCase': 1,
        'ignoredNodes': ['TemplateLiteral']
      }],
      
      // 引号规则（双引号）
      'quotes': ['error', 'double', { 'avoidEscape': true }],
      
      // 分号规则（必须使用）
      'semi': ['error', 'always'],
      
      // 逗号后空格
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      
      // 对象花括号间空格
      'object-curly-spacing': ['error', 'always'],
      
      // 数组方括号间空格
      'array-bracket-spacing': ['error', 'never'],
      
      // 关键字前后空格
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      
      // 函数括号前空格
      'space-before-function-paren': ['error', {
        'anonymous': 'never',
        'named': 'never',
        'asyncArrow': 'always'
      }],
      
      // ==================== The Graph 特定规则 ====================
      
      // 允许 console.log（用于 log.info 等调试）
      'no-console': 'off',
      
      // 允许空函数（某些事件处理器可能为空）
      'no-empty-function': 'warn',
      
      // 允许使用 require（The Graph 工具链需要）
      '@typescript-eslint/no-var-requires': 'off',
      
      // 允许非空断言（AssemblyScript 中常用）
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // ==================== 注释和文档规则 ====================
      
      // 多行注释样式
      'multiline-comment-style': ['warn', 'starred-block'],
      
      // ==================== 安全和最佳实践 ====================
      
      // 禁止使用 eval
      'no-eval': 'error',
      
      // 禁止隐式类型转换
      'no-implicit-coercion': 'warn',
      
      // 要求 switch 语句有 default
      'default-case': 'warn',
      
      // 禁止在 return 之后有代码
      'no-unreachable': 'error',
      
      // 检查有效的 typeof 比较
      'valid-typeof': 'error',
    }
  },
  
  // Prettier 兼容性配置（必须放在最后）
  prettier,
];