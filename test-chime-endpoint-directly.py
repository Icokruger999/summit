#!/usr/bin/env python3
"""
Test Chime endpoint directly with curl
"""
import requests
import json

# You'll need a valid JWT token - get it from browser devtools
# Or create a test user and login

print("🧪 TESTING CHIME ENDPOINT DIRECTLY")
print("=" * 60)

print("\nTo test, we need a valid JWT token.")
print("Get it from browser DevTools:")
print("1. Open DevTools (F12)")
print("2. Go to Application > Local Storage")
print("3. Find 'token' key")
print("4. Copy the value")
print("\nOr check the Network tab for Authorization header")

# For now, let's just check if the endpoint is accessible
print("\n\nTesting endpoint accessibility...")

try:
    response = requests.post(
        'https://summit.api.codingeverest.com/api/chime/meeting',
        json={'chatId': 'test-chat'},
        headers={'Content-Type': 'application/json'},
        timeout=10
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 401:
        print("\n✅ Endpoint is accessible (401 = needs authentication)")
    elif response.status_code == 500:
        print("\n❌ Server error - check backend logs")
        print(f"Error: {response.json()}")
    
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)
print("\nNEXT: Get a valid token from the browser and test with:")
print("curl -X POST https://summit.api.codingeverest.com/api/chime/meeting \\")
print("  -H 'Authorization: Bearer YOUR_TOKEN' \\")
print("  -H 'Content-Type: application/json' \\")
print("  -d '{\"chatId\": \"test-chat\"}'")
