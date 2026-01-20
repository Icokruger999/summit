#!/usr/bin/env python3
import requests
import json

API_URL = "https://summit.api.codingeverest.com"

# First login to get token
print("1. Logging in...")
response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Stacey@1122"
})
print(f"Login Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    token = data.get("token")
    user_id = data.get("user", {}).get("id")
    print(f"User ID: {user_id}")
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Test getting current presence
    print("\n2. Getting current presence...")
    presence_response = requests.get(f"{API_URL}/api/presence/{user_id}", headers=headers)
    print(f"Get Presence Status: {presence_response.status_code}")
    print(f"Response: {presence_response.text}")
    
    # Test updating presence to "online"
    print("\n3. Updating presence to 'online'...")
    update_response = requests.put(f"{API_URL}/api/presence", 
        headers=headers,
        json={"status": "online"}
    )
    print(f"Update Status: {update_response.status_code}")
    print(f"Response: {update_response.text}")
    
    # Test updating presence to "busy"
    print("\n4. Updating presence to 'busy'...")
    update_response = requests.put(f"{API_URL}/api/presence", 
        headers=headers,
        json={"status": "busy"}
    )
    print(f"Update Status: {update_response.status_code}")
    print(f"Response: {update_response.text}")
    
    # Verify the change
    print("\n5. Verifying presence change...")
    presence_response = requests.get(f"{API_URL}/api/presence/{user_id}", headers=headers)
    print(f"Get Presence Status: {presence_response.status_code}")
    print(f"Response: {presence_response.text}")
else:
    print("Login failed")
