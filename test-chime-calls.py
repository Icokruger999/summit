#!/usr/bin/env python3
"""
Test Chime SDK call functionality
"""
import requests
import json

BASE_URL = 'https://summit.api.codingeverest.com'

# First, let's check what Chime endpoints exist
print("🔍 TESTING CHIME SDK CALL FUNCTIONALITY")
print("=" * 60)

# Test 1: Check health endpoint shows Chime is enabled
print("\n1. Checking if Chime SDK is enabled...")
try:
    response = requests.get(f'{BASE_URL}/health', timeout=5)
    if response.status_code == 200:
        data = response.json()
        print(f"   Status: {data.get('status')}")
        print(f"   Chime: {data.get('chime')}")
        if data.get('chime') == 'enabled':
            print("   ✅ Chime SDK is enabled")
        else:
            print("   ❌ Chime SDK is not enabled")
    else:
        print(f"   ❌ Health check failed: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error: {e}")

# Test 2: Check if Chime endpoints exist
print("\n2. Checking for Chime endpoints...")
print("   Looking for /api/chime/* endpoints in backend...")

# We need to check the backend code for Chime endpoints
print("\n3. Need to check backend implementation...")
print("   Will check server code for Chime meeting endpoints")

print("\n" + "=" * 60)
print("Next steps:")
print("1. Check backend code for Chime meeting creation endpoint")
print("2. Test creating a Chime meeting")
print("3. Test joining a Chime meeting")
print("4. Check frontend integration")
