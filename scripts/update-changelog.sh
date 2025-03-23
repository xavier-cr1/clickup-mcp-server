#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p $(dirname "$0")

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LATEST_TAG" ]; then
  # If no tags exist, get all commits
  COMMITS=$(git log --pretty=format:"%s" --reverse)
  echo "No previous tags found. Including all commits."
else
  # Get commits since the latest tag
  COMMITS=$(git log ${LATEST_TAG}..HEAD --pretty=format:"%s" --reverse)
  echo "Getting commits since ${LATEST_TAG}"
fi

# Initialize categories
FEATURES=""
FIXES=""
CHORES=""
OTHERS=""

# Categorize commits based on conventional commit format
while IFS= read -r COMMIT; do
  if [[ "$COMMIT" == feat* ]]; then
    FEATURES="${FEATURES}- ${COMMIT#feat*: }\n"
  elif [[ "$COMMIT" == fix* ]]; then
    FIXES="${FIXES}- ${COMMIT#fix*: }\n"
  elif [[ "$COMMIT" == chore* ]]; then
    CHORES="${CHORES}- ${COMMIT#chore*: }\n"
  else
    OTHERS="${OTHERS}- ${COMMIT}\n"
  fi
done <<< "$COMMITS"

# Prepare the new unreleased section
NEW_CONTENT="## Unreleased\n\n"

if [ ! -z "$FEATURES" ]; then
  NEW_CONTENT="${NEW_CONTENT}### 🚀 Features\n\n${FEATURES}\n"
fi

if [ ! -z "$FIXES" ]; then
  NEW_CONTENT="${NEW_CONTENT}### 🐛 Bug Fixes\n\n${FIXES}\n"
fi

if [ ! -z "$CHORES" ]; then
  NEW_CONTENT="${NEW_CONTENT}### 🔧 Maintenance\n\n${CHORES}\n"
fi

if [ ! -z "$OTHERS" ]; then
  NEW_CONTENT="${NEW_CONTENT}### 🔄 Other Changes\n\n${OTHERS}\n"
fi

# Check if changelog.md exists
if [ ! -f "changelog.md" ]; then
  echo -e "# Changelog\n\n${NEW_CONTENT}" > changelog.md
  echo "Created new changelog.md file"
  exit 0
fi

# Update the changelog file
if grep -q "## Unreleased" changelog.md; then
  # Replace existing Unreleased section
  sed -i.bak "s/## Unreleased.*/$NEW_CONTENT/g" changelog.md
  rm changelog.md.bak
else
  # Add new Unreleased section at the top (after the title)
  sed -i.bak "1s/^/# Changelog\n\n${NEW_CONTENT}/" changelog.md
  rm changelog.md.bak
fi

echo "Successfully updated changelog.md with new entries" 