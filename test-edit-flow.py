#!/usr/bin/env python3
"""Test the complete edit flow: send message, edit it, verify"""
import requests
import json
import time
import uuid

API_URL = "https://summit.api.codingeverest.com"

# Login
print("🔐 Logging in...")
login_response = requests.post(f"{API_URL}/api/auth/login", json={
    "email": "ico@astutetech.co.za",
    "password": "Stacey@1122"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    exit(1)

token = login_response.json()["token"]
user_id = login_response.json()["user"]["id"]
print(f"✅ Logged in as {user_id}")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get first chat
print("\n📥 Fetching chats...")
chats_response = requests.get(f"{API_URL}/api/chats", headers=headers)
if chats_response.status_code != 200:
    print(f"❌ Failed to fetch chats")
    exit(1)

chats = chats_response.json()
if len(chats) == 0:
    print("❌ No chats found")
    exit(1)

chat_id = chats[0]["id"]
print(f"✅ Using chat: {chat_id}")

# Send a test message
message_id = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
original_content = "Test message for editing"
print(f"\n📤 Sending test message: {message_id}")
print(f"   Content: {original_content}")

send_response = requests.post(
    f"{API_URL}/api/messages",
    headers=headers,
    json={
        "id": message_id,
        "chatId": chat_id,
        "content": original_content,
        "type": "text"
    }
)

if send_response.status_code != 200:
    print(f"❌ Failed to send message: {send_response.status_code}")
    print(send_response.text)
    exit(1)

print("✅ Message sent successfully")

# Wait a moment
time.sleep(1)

# Edit the message
edited_content = "This message has been edited!"
print(f"\n✏️ Editing message...")
print(f"   New content: {edited_content}")

edit_response = requests.put(
    f"{API_URL}/api/messages/{message_id}",
    headers=headers,
    json={"content": edited_content}
)

if edit_response.status_code != 200:
    print(f"❌ Failed to edit message: {edit_response.status_code}")
    print(edit_response.text)
    exit(1)

edit_result = edit_response.json()
print(f"✅ Message edited successfully!")
print(f"   editedAt: {edit_result.get('editedAt')}")

# Verify the edit
print(f"\n🔍 Verifying edit...")
messages_response = requests.get(f"{API_URL}/api/messages/{chat_id}", headers=headers)
if messages_response.status_code != 200:
    print(f"❌ Failed to fetch messages")
    exit(1)

messages = messages_response.json()
edited_message = next((m for m in messages if m["id"] == message_id), None)

if not edited_message:
    print("❌ Message not found!")
    exit(1)

print(f"✅ Message found:")
print(f"   Content: {edited_message['content']}")
print(f"   editedAt: {edited_message.get('editedAt')}")

if edited_message['content'] == edited_content:
    print("\n✅ SUCCESS! Message edit flow works correctly!")
else:
    print(f"\n❌ FAILED! Content mismatch:")
    print(f"   Expected: {edited_content}")
    print(f"   Got: {edited_message['content']}")
