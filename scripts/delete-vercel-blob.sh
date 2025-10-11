#!/bin/bash

# Delete all blobs from Vercel Blob storage using curl
# This script requires BLOB_READ_WRITE_TOKEN environment variable

if [ -z "$BLOB_READ_WRITE_TOKEN" ]; then
    echo "❌ BLOB_READ_WRITE_TOKEN not found"
    echo "Run: export BLOB_READ_WRITE_TOKEN='your_token'"
    exit 1
fi

echo "🗑️  Deleting all blobs from Vercel Blob storage..."
echo ""

# List all blobs
echo "📋 Listing blobs..."
response=$(curl -s "https://blob.vercel-storage.com/?action=list" \
  -H "authorization: Bearer $BLOB_READ_WRITE_TOKEN")

# Extract URLs using grep and sed
urls=$(echo "$response" | grep -o '"url":"[^"]*"' | sed 's/"url":"//g' | sed 's/"//g')

if [ -z "$urls" ]; then
    echo "✅ No blobs found! Storage is already empty."
    exit 0
fi

count=$(echo "$urls" | wc -l | tr -d ' ')
echo "Found $count blobs to delete"
echo ""

# Delete each blob
deleted=0
failed=0

while IFS= read -r url; do
    if [ ! -z "$url" ]; then
        filename=$(basename "$url" | cut -d'?' -f1)
        echo "🗑️  Deleting: $filename"
        
        delete_response=$(curl -s -X POST "https://blob.vercel-storage.com/delete" \
          -H "authorization: Bearer $BLOB_READ_WRITE_TOKEN" \
          -H "content-type: application/json" \
          -d "{\"urls\":[\"$url\"]}")
        
        if echo "$delete_response" | grep -q "error"; then
            echo "   ❌ Failed"
            ((failed++))
        else
            echo "   ✅ Deleted"
            ((deleted++))
        fi
    fi
done <<< "$urls"

echo ""
echo "=================================================="
echo "✅ Deletion completed!"
echo "🗑️  Deleted: $deleted"
echo "❌ Failed: $failed"
echo "=================================================="
echo ""
echo "💡 You can now delete the Blob store from Vercel dashboard"

