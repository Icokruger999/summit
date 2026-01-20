#!/usr/bin/env python3
import requests
import json

API_URL = "https://api.summit.astutetech.co.za"

# First login to get a token (using a different user to search for ico)
print("Logging in as test user to search for ico@astutetech.co.za...")
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "thechihuahua01@gmail.com",
    "password": "password123"  # Adjust if different
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    
    # Try another user
    print("\nTrying robert.nicol@astutetech.co.za...")
    login_response = requests.post(f"{API_URL}/api/auth/login", json={
        "email": "robert.nicol@astutetech.co.za",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(login_response.text)
        exit(1)

token = login_response.json().get("token")
print(f"Got token: {token[:50]}...")

# Now search for ico@astutetech.co.za
print("\nSearching for ico@astutetech.co.za...")
headers = {"Authorization": f"Bearer {token}"}
search_response = requests.get(
    f"{API_URL}/api/users/search",
    params={"email": "ico@astutetech.co.za"},
    headers=headers
)

print(f"Search status: {search_response.status_code}")
print(f"Search response: {search_response.text}")

# Also try with uppercase
print("\nSearching with uppercase ICO@ASTUTETECH.CO.ZA...")
search_response2 = requests.get(
    f"{API_URL}/api/users/search",
    params={"email": "ICO@ASTUTETECH.CO.ZA"},
    headers=headers
)
print(f"Search status: {search_response2.status_code}")
print(f"Search response: {search_response2.text}")
