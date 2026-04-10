#!/bin/bash
VERSION=$(node -p "require('./package.json').version")
IFS='.' read -ra PARTS <<< "$VERSION"
NEW="${PARTS[0]}.${PARTS[1]}.$((PARTS[2]+1))"
sed -i '' "s/\"version\": \"$VERSION\"/\"version\": \"$NEW\"/" package.json
sed -i '' "s/Version $VERSION/Version $NEW/g" src/pages/SplashPage.tsx
sed -i '' "s/'$VERSION'/'$NEW'/g" src/pages/ProfilPage.tsx
sed -i '' "s/VespaRecorder v${PARTS[0]}\.${PARTS[1]}\.[0-9]*/VespaRecorder v$NEW/g" src/pages/ListePage.tsx
sed -i '' "s/VespaRecorder v${PARTS[0]}\.${PARTS[1]}\.[0-9]*/VespaRecorder v$NEW/g" src/pages/RapportPage.tsx
echo "✅ $VERSION → $NEW"
