#!/bin/bash

# Set your copyright information
OWNER="Talib Kareem"
EMAIL="taazkareem@icloud.com"
YEAR=$(date +%Y)
LICENSE="MIT"

find src -type f -name "*.ts" | while read file; do
  # Skip if the file already has a copyright notice
  if grep -q "SPDX-FileCopyrightText\|Copyright" "$file"; then
    echo "Skipping $file - already has copyright notice"
    continue
  fi
  
  # Create a temporary file
  temp_file=$(mktemp)
  
  # Check if file starts with an existing JSDoc comment
  if grep -q "^/\*\*" "$file"; then
    # Extract the existing JSDoc comment
    start_line=$(grep -n "^/\*\*" "$file" | head -1 | cut -d":" -f1)
    end_line=$(grep -n "^\s*\*/" "$file" | head -1 | cut -d":" -f1)
    
    # Add SPDX identifiers to the top
    echo "/**" > "$temp_file"
    echo " * SPDX-FileCopyrightText: © $YEAR $OWNER <$EMAIL>" >> "$temp_file"
    echo " * SPDX-License-Identifier: $LICENSE" >> "$temp_file"
    echo " *" >> "$temp_file"
    
    # Add the rest of the original JSDoc content (excluding the first line with /**)
    tail -n +$((start_line + 1)) "$file" | head -n $((end_line - start_line)) >> "$temp_file"
    
    # Add the rest of the original file content after the JSDoc
    tail -n +$((end_line + 1)) "$file" >> "$temp_file"
  else
    # No existing JSDoc, add a new one with copyright info
    echo "/**" > "$temp_file"
    echo " * SPDX-FileCopyrightText: © $YEAR $OWNER <$EMAIL>" >> "$temp_file"
    echo " * SPDX-License-Identifier: $LICENSE" >> "$temp_file"
    echo " */" >> "$temp_file"
    echo "" >> "$temp_file"
    
    # Add original content
    cat "$file" >> "$temp_file"
  fi
  
  # Replace original with the new content
  mv "$temp_file" "$file"
  
  echo "Added copyright to $file"
done