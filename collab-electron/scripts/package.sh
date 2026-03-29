#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

NO_SIGN=false
for arg in "$@"; do
  case "$arg" in
    --no-sign) NO_SIGN=true ;;
  esac
done

if [ "$NO_SIGN" = true ]; then
  export CSC_IDENTITY_AUTO_DISCOVERY=false
  export SKIP_NOTARIZE=true
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Collaborator Package Build${NC}"
echo "=========================="

# Step 1: Vendor tmux
echo -e "\n${BLUE}[1/3] Vendor tmux${NC}"
START=$(date +%s)
./scripts/vendor-tmux.sh
END=$(date +%s)
echo -e "${GREEN}Done in $((END - START))s${NC}"

# Step 2: Build with electron-vite
echo -e "\n${BLUE}[2/3] electron-vite build${NC}"
START=$(date +%s)
bunx electron-vite build
END=$(date +%s)
echo -e "${GREEN}Done in $((END - START))s${NC}"

# Step 3: electron-builder (signs, notarizes via hooks, creates artifacts)
echo -e "\n${BLUE}[3/3] electron-builder${NC}"
START=$(date +%s)
BUILDER_ARGS="--mac --arm64 --publish never"
if [ "$NO_SIGN" = true ]; then
  BUILDER_ARGS="$BUILDER_ARGS --config.mac.identity=null"
fi
bunx electron-builder $BUILDER_ARGS
END=$(date +%s)
echo -e "${GREEN}Done in $((END - START))s${NC}"

echo -e "\n${GREEN}Package build completed.${NC}"
