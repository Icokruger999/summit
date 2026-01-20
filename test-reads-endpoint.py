#!/usr/bin/env python3
"""Test the reads endpoint directly"""

import requests
import json

API_URL = "https://summit.api.codingeverest.com"

# First login to get a token
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "robert.nicol@astutetech.co.za",
    "password": "Test123!"
})

print(f"Login status: {login_response.status_code}")
if login_response.status_code != 200:
    print(f"Login failed: {login_response.text}")
    exit(1)

data = login_response.json()
token = data.get('token')
print(f"Got token: {token[:50]}...")

headers = {"Authorization": f"Bearer {token}"}

# Test the reads endpoint
print("\n=== Testing /api/messages/reads ===")
reads_response = requests.post(f"{API_URL}/api/messages/reads", 
    headers=headers,
    json={"messageIds": ["test-message-id"]}
)
print(f"Status: {reads_response.status_code}")
print(f"Response: {reads_response.text}")

# Test the chats endpoint
print("\n=== Testing /api/chats ===")
chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
print(f"Status: {chats_response.status_code}")
if chats_response.status_code == 200:
    chats = chats_response.json()
    print(f"Got {len(chats)} chats")
    if chats:
        print(f"First chat: {json.dumps(chats[0], indent=2, default=str)}")
else:
    print(f"Response: {chats_response.text}")

# Test the health endpoint
print("\n=== Testing /api/health ===")
health_response = requests.get(f"{API_URL}/api/health")
print(f"Status: {health_response.status_code}")
print(f"Response: {health_response.text}")
