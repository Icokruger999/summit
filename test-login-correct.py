#!/usr/bin/env python3
import requests
import json

API_URL = "https://summit.api.codingeverest.com"

# Test login with correct password
print("Testing login...")
response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Stacey@1122"
})
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}")

if response.status_code == 200:
    data = response.json()
    token = data.get("token")
    if token:
        print("\n✅ Login successful!")
        print(f"Token: {token[:50]}...")
        
        # Test chats endpoint
        print("\nTesting /chats endpoint...")
        headers = {"Authorization": f"Bearer {token}"}
        chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
        print(f"Chats Status: {chats_response.status_code}")
        print(f"Chats Response: {chats_response.text[:500]}")
else:
    print("\n❌ Login failed")
