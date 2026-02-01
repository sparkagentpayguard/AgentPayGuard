#!/bin/bash
# 使用 Foundry 部署多签钱包和冻结合约
# 
# 使用方法:
#   chmod +x scripts/deploy-with-foundry.sh
#   ./scripts/deploy-with-foundry.sh 0xowner1 0xowner2 0xowner3
#
# 或设置环境变量:
#   export OWNER1=0xowner1
#   export OWNER2=0xowner2
#   export OWNER3=0xowner3
#   ./scripts/deploy-with-foundry.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 🚀 使用 Foundry 部署多签钱包和冻结合约 ===${NC}\n"

# 检查 Foundry 是否安装
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Foundry 未安装${NC}"
    echo "安装方法:"
    echo "  curl -L https://foundry.paradigm.xyz | bash"
    echo "  foundryup"
    exit 1
fi

# 获取 owner 地址
OWNER1=${1:-${OWNER1}}
OWNER2=${2:-${OWNER2}}
OWNER3=${3:-${OWNER3}}

if [ -z "$OWNER1" ] || [ -z "$OWNER2" ] || [ -z "$OWNER3" ]; then
    echo -e "${RED}❌ 需要3个 owner 地址${NC}"
    echo "使用方法:"
    echo "  $0 0xowner1 0xowner2 0xowner3"
    echo "或设置环境变量:"
    echo "  export OWNER1=0xowner1"
    echo "  export OWNER2=0xowner2"
    echo "  export OWNER3=0xowner3"
    echo "  $0"
    exit 1
fi

# 检查环境变量
if [ -z "$RPC_URL" ]; then
    RPC_URL="https://rpc-testnet.gokite.ai/"
    echo -e "${YELLOW}⚠️  RPC_URL 未设置，使用默认: $RPC_URL${NC}"
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}❌ PRIVATE_KEY 未设置${NC}"
    echo "请设置部署者钱包私钥:"
    echo "  export PRIVATE_KEY=0x你的私钥"
    exit 1
fi

CHAIN_ID=${CHAIN_ID:-2368}

echo "网络配置:"
echo "  RPC: $RPC_URL"
echo "  Chain ID: $CHAIN_ID"
echo "  Owner 1: $OWNER1"
echo "  Owner 2: $OWNER2"
echo "  Owner 3: $OWNER3"
echo ""

# 检查是否已初始化 Foundry 项目
if [ ! -f "foundry.toml" ]; then
    echo -e "${YELLOW}⚠️  未找到 foundry.toml，初始化 Foundry 项目...${NC}"
    forge init --force --no-git
fi

# 安装 OpenZeppelin 依赖
if [ ! -d "lib/openzeppelin-contracts" ]; then
    echo -e "${YELLOW}安装 OpenZeppelin 依赖...${NC}"
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
fi

# 编译合约
echo -e "${GREEN}📦 编译合约...${NC}"
forge build

# 部署 SimpleMultiSig
echo -e "\n${GREEN}📦 步骤 1/3: 部署 SimpleMultiSig...${NC}"
MULTISIG_OUTPUT=$(forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    contracts/SimpleMultiSig.sol:SimpleMultiSig \
    --constructor-args "$OWNER1" "$OWNER2" "$OWNER3")

MULTISIG_ADDRESS=$(echo "$MULTISIG_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$MULTISIG_ADDRESS" ]; then
    echo -e "${RED}❌ 部署失败${NC}"
    echo "$MULTISIG_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ SimpleMultiSig 部署成功!${NC}"
echo "  地址: $MULTISIG_ADDRESS"

# 部署 SimpleFreeze
echo -e "\n${GREEN}📦 步骤 2/3: 部署 SimpleFreeze...${NC}"
FREEZE_OUTPUT=$(forge create \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    contracts/SimpleFreeze.sol:SimpleFreeze)

FREEZE_ADDRESS=$(echo "$FREEZE_OUTPUT" | grep "Deployed to:" | awk '{print $3}')

if [ -z "$FREEZE_ADDRESS" ]; then
    echo -e "${RED}❌ 部署失败${NC}"
    echo "$FREEZE_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✅ SimpleFreeze 部署成功!${NC}"
echo "  地址: $FREEZE_ADDRESS"

# 转移 Freeze 合约所有权
echo -e "\n${GREEN}📦 步骤 3/3: 转移 Freeze 合约所有权给多签...${NC}"
cast send \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    "$FREEZE_ADDRESS" \
    "transferOwnership(address)" \
    "$MULTISIG_ADDRESS" \
    > /dev/null 2>&1

echo -e "${GREEN}✅ 所有权转移成功!${NC}"

# 验证
echo -e "\n${GREEN}🔍 验证部署...${NC}"
FREEZE_OWNER=$(cast call \
    --rpc-url "$RPC_URL" \
    "$FREEZE_ADDRESS" \
    "owner()(address)")

if [ "$FREEZE_OWNER" = "$MULTISIG_ADDRESS" ]; then
    echo -e "${GREEN}✅ 验证通过: Freeze 合约由多签控制${NC}"
else
    echo -e "${RED}❌ 验证失败: Freeze 合约 owner 不匹配${NC}"
    echo "  期望: $MULTISIG_ADDRESS"
    echo "  实际: $FREEZE_OWNER"
fi

# 输出总结
echo -e "\n${GREEN}=== ✅ 部署完成 ===${NC}\n"
echo "📋 部署信息:"
echo "  多签地址: $MULTISIG_ADDRESS"
echo "  冻结合约: $FREEZE_ADDRESS"
echo "  阈值: 2/3"
echo ""
echo "📝 下一步操作:"
echo "  1. 更新 .env 文件:"
echo "     MULTISIG_ADDRESS=$MULTISIG_ADDRESS"
echo "     FREEZE_ADDRESS=$FREEZE_ADDRESS"
echo "  2. 更新前端配置 (frontend/src/lib/web3/config.ts)"
echo "  3. 运行: pnpm demo:multisig-info 验证部署"
echo ""
echo "🔗 区块浏览器:"
echo "  多签: https://testnet.kitescan.ai/address/$MULTISIG_ADDRESS"
echo "  冻结: https://testnet.kitescan.ai/address/$FREEZE_ADDRESS"
