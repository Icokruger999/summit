#!/usr/bin/env python3
"""Test endpoints with a fresh token"""

import requests
import json

API_URL = "https://summit.api.codingeverest.com"

# Try login with ico user
print("=== Trying login with ico@astutetech.co.za ===")
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Test123!"
})
print(f"Status: {login_response.status_code}")
print(f"Response: {login_response.text[:200]}")

if login_response.status_code == 200:
    data = login_response.json()
    token = data.get('token')
    print(f"\nGot token!")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test chats
    print("\n=== Testing /api/chats ===")
    chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
    print(f"Status: {chats_response.status_code}")
    if chats_response.status_code == 200:
        chats = chats_response.json()
        print(f"Got {len(chats)} chats")
    else:
        print(f"Response: {chats_response.text}")
    
    # Test reads
    print("\n=== Testing /api/messages/reads ===")
    reads_response = requests.post(f"{API_URL}/api/messages/reads", 
        headers=headers,
        json={"messageIds": ["1768809138444-mhokig"]}  # Real message ID from logs
    )
    print(f"Status: {reads_response.status_code}")
    print(f"Response: {reads_response.text}")
