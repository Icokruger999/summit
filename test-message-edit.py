#!/usr/bin/env python3
"""Test message edit functionality"""
import requests
import json

API_URL = "https://summit.api.codingeverest.com"

# Login first
print("🔐 Logging in...")
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Stacey@1122"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json()["token"]
print(f"✅ Logged in successfully")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get chats to find a chat with messages
print("\n📥 Fetching chats...")
chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
if chats_response.status_code != 200:
    print(f"❌ Failed to fetch chats: {chats_response.status_code}")
    exit(1)

chats = chats_response.json()
print(f"✅ Found {len(chats)} chats")

if len(chats) == 0:
    print("❌ No chats found")
    exit(1)

# Get messages from first chat
chat_id = chats[0]["id"]
print(f"\n📥 Fetching messages from chat {chat_id}...")
messages_response = requests.get(f"{API_URL}/api/messages/{chat_id}", headers=headers)
if messages_response.status_code != 200:
    print(f"❌ Failed to fetch messages: {messages_response.status_code}")
    exit(1)

messages = messages_response.json()
print(f"✅ Found {len(messages)} messages")

if len(messages) == 0:
    print("❌ No messages found in chat")
    exit(1)

# Find a message sent by the current user
user_id = login_response.json()["user"]["id"]
own_messages = [m for m in messages if m["senderId"] == user_id]

if len(own_messages) == 0:
    print("❌ No messages sent by current user")
    exit(1)

message_to_edit = own_messages[0]
print(f"\n📝 Testing edit on message: {message_to_edit['id']}")
print(f"   Original content: {message_to_edit['content']}")

# Try to edit the message
new_content = f"{message_to_edit['content']} [EDITED TEST]"
print(f"   New content: {new_content}")

edit_response = requests.put(
    f"{API_URL}/api/messages/{message_to_edit['id']}",
    headers=headers,
    json={"content": new_content}
)

print(f"\n📤 Edit response status: {edit_response.status_code}")
print(f"📤 Edit response body: {edit_response.text}")

if edit_response.status_code == 200:
    print("✅ Message edited successfully!")
    result = edit_response.json()
    print(f"   editedAt: {result.get('editedAt')}")
    
    # Verify the edit by fetching messages again
    print("\n🔍 Verifying edit...")
    verify_response = requests.get(f"{API_URL}/api/messages/{chat_id}", headers=headers)
    if verify_response.status_code == 200:
        updated_messages = verify_response.json()
        updated_message = next((m for m in updated_messages if m["id"] == message_to_edit["id"]), None)
        if updated_message:
            print(f"✅ Verified content: {updated_message['content']}")
            print(f"✅ editedAt: {updated_message.get('editedAt')}")
        else:
            print("⚠️ Message not found in updated list")
else:
    print(f"❌ Edit failed: {edit_response.status_code}")
    print(f"   Error: {edit_response.text}")
