#!/usr/bin/env python3
import requests
import json

API_URL = "https://summit.api.codingeverest.com"

print("VERIFYING ALL ENDPOINTS")
print("=" * 60)

# Login
print("\n1. Testing login...")
response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Stacey@1122"
})
print(f"Login: {response.status_code} ✓" if response.status_code == 200 else f"Login: {response.status_code} ✗")

if response.status_code == 200:
    data = response.json()
    token = data.get("token")
    user_id = data.get("user", {}).get("id")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Test presence
    print("\n2. Testing presence...")
    presence_response = requests.get(f"{API_URL}/api/presence/{user_id}", headers=headers)
    print(f"Presence: {presence_response.status_code} ✓" if presence_response.status_code == 200 else f"Presence: {presence_response.status_code} ✗")
    
    # Test chats
    print("\n3. Testing chats...")
    chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
    print(f"Chats: {chats_response.status_code} ✓" if chats_response.status_code == 200 else f"Chats: {chats_response.status_code} ✗")
    if chats_response.status_code == 200:
        chats = chats_response.json()
        print(f"   Found {len(chats)} chats")
    
    # Test chime endpoints
    print("\n4. Testing chime endpoints...")
    
    # Test creating a meeting
    meeting_response = requests.post(f"{API_URL}/api/chime/meeting", 
        headers=headers,
        json={"chatId": "test-chat-123"}
    )
    print(f"Create Meeting: {meeting_response.status_code} ✓" if meeting_response.status_code == 200 else f"Create Meeting: {meeting_response.status_code} ✗")
    
    if meeting_response.status_code == 200:
        meeting_data = meeting_response.json()
        meeting_id = meeting_data.get("meeting", {}).get("MeetingId")
        print(f"   Meeting ID: {meeting_id}")
        
        # Test creating an attendee
        attendee_response = requests.post(f"{API_URL}/api/chime/attendee",
            headers=headers,
            json={"meetingId": meeting_id}
        )
        print(f"Create Attendee: {attendee_response.status_code} ✓" if attendee_response.status_code == 200 else f"Create Attendee: {attendee_response.status_code} ✗")
        
        # Test notify endpoint
        notify_response = requests.post(f"{API_URL}/api/chime/notify",
            headers=headers,
            json={
                "recipientId": user_id,
                "roomName": "test-room",
                "callType": "video"
            }
        )
        print(f"Notify: {notify_response.status_code} ✓" if notify_response.status_code == 200 else f"Notify: {notify_response.status_code} ✗")
    else:
        print(f"   Error: {meeting_response.text}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)
