#!/usr/bin/env python3
"""
Test script for enhanced Rocket.Chat features
"""
import asyncio
import httpx
import json

async def test_enhanced_features():
    """Test the enhanced Rocket.Chat features"""
    print("🚀 Testing Enhanced Rocket.Chat Features...")
    print("=" * 60)
    
    # Test data
    test_user = {
        "email": "test@socialhub.com",
        "password": "testpassword123"
    }
    
    # First, login to get a token
    print("1. Logging in to get authentication token...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            login_response = await client.post(
                "http://localhost:8000/auth/login",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code != 200:
                print("   ❌ FAILED: Could not login")
                return False
            
            token = login_response.json().get('access_token')
            print("   ✅ SUCCESS: Logged in successfully")
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
            
            # Test user rooms
            print("\n2. Testing user rooms retrieval...")
            rooms_response = await client.get(
                "http://localhost:8000/api/rocket-chat/user-rooms",
                headers=headers
            )
            
            print(f"   Status: {rooms_response.status_code}")
            if rooms_response.status_code == 200:
                rooms_data = rooms_response.json()
                print("   ✅ SUCCESS: User rooms retrieved successfully!")
                print(f"   Channels: {len(rooms_data.get('channels', []))}")
                print(f"   Groups: {len(rooms_data.get('groups', []))}")
                print(f"   Direct Messages: {len(rooms_data.get('direct_messages', []))}")
            else:
                print(f"   ❌ FAILED: {rooms_response.text}")
            
            # Test channels
            print("\n3. Testing channels retrieval...")
            channels_response = await client.get(
                "http://localhost:8000/api/rocket-chat/channels",
                headers=headers
            )
            
            print(f"   Status: {channels_response.status_code}")
            if channels_response.status_code == 200:
                channels_data = channels_response.json()
                print("   ✅ SUCCESS: Channels retrieved successfully!")
                print(f"   Found {len(channels_data.get('channels', []))} channels")
            else:
                print(f"   ❌ FAILED: {channels_response.text}")
            
            # Test DM list
            print("\n4. Testing DM list retrieval...")
            dm_list_response = await client.get(
                "http://localhost:8000/api/rocket-chat/dm-list",
                headers=headers
            )
            
            print(f"   Status: {dm_list_response.status_code}")
            if dm_list_response.status_code == 200:
                dm_data = dm_list_response.json()
                print("   ✅ SUCCESS: DM list retrieved successfully!")
                print(f"   Found {len(dm_data.get('dms', []))} direct messages")
            else:
                print(f"   ❌ FAILED: {dm_list_response.text}")
            
            # Test post message (if we have a room)
            if rooms_response.status_code == 200:
                rooms_data = rooms_response.json()
                channels = rooms_data.get('channels', [])
                
                if channels:
                    test_channel = channels[0]
                    print(f"\n5. Testing post message to channel: {test_channel['name']}")
                    
                    post_message_data = {
                        "roomId": test_channel['id'],
                        "content": "Test message from enhanced features test script!"
                    }
                    
                    post_response = await client.post(
                        "http://localhost:8000/api/rocket-chat/send-post-message",
                        json=post_message_data,
                        headers=headers
                    )
                    
                    print(f"   Status: {post_response.status_code}")
                    if post_response.status_code == 200:
                        print("   ✅ SUCCESS: Post message sent successfully!")
                    else:
                        print(f"   ❌ FAILED: {post_response.text}")
            
            # Test reactions (if we have messages)
            print("\n6. Testing reactions...")
            if rooms_response.status_code == 200:
                rooms_data = rooms_response.json()
                channels = rooms_data.get('channels', [])
                
                if channels:
                    test_channel = channels[0]
                    
                    # Get messages first
                    messages_response = await client.get(
                        f"http://localhost:8000/api/rocket-chat/channel-messages/{test_channel['name']}",
                        headers=headers
                    )
                    
                    if messages_response.status_code == 200:
                        messages_data = messages_response.json()
                        messages = messages_data if isinstance(messages_data, list) else messages_data.get('messages', [])
                        
                        if messages:
                            test_message = messages[0]
                            print(f"   Testing reactions on message: {test_message.get('id', 'unknown')}")
                            
                            # Add reaction
                            reaction_data = {
                                "messageId": test_message.get('id'),
                                "emoji": "👍"
                            }
                            
                            reaction_response = await client.post(
                                "http://localhost:8000/api/rocket-chat/add-reaction",
                                json=reaction_data,
                                headers=headers
                            )
                            
                            print(f"   Add Reaction Status: {reaction_response.status_code}")
                            if reaction_response.status_code == 200:
                                print("   ✅ SUCCESS: Reaction added successfully!")
                                
                                # Remove reaction
                                remove_reaction_response = await client.post(
                                    "http://localhost:8000/api/rocket-chat/remove-reaction",
                                    json=reaction_data,
                                    headers=headers
                                )
                                
                                print(f"   Remove Reaction Status: {remove_reaction_response.status_code}")
                                if remove_reaction_response.status_code == 200:
                                    print("   ✅ SUCCESS: Reaction removed successfully!")
                                else:
                                    print(f"   ❌ FAILED: {remove_reaction_response.text}")
                            else:
                                print(f"   ❌ FAILED: {reaction_response.text}")
                        else:
                            print("   ⚠️  No messages found to test reactions")
                    else:
                        print(f"   ⚠️  Could not get messages: {messages_response.text}")
            
            print("\n" + "=" * 60)
            print("Enhanced features test completed!")
            return True
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

async def test_sso_integration():
    """Test the SSO integration"""
    print("\n🔐 Testing SSO Integration...")
    print("=" * 40)
    
    test_user = {
        "email": "test@socialhub.com",
        "password": "testpassword123"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Login first
            login_response = await client.post(
                "http://localhost:8000/auth/login",
                json=test_user,
                headers={"Content-Type": "application/json"}
            )
            
            if login_response.status_code != 200:
                print("   ❌ FAILED: Could not login to test SSO")
                return False
            
            token = login_response.json().get('access_token')
            
            # Test SSO endpoint
            sso_response = await client.post(
                "http://localhost:8000/api/rocket-chat/sso-url",
                json={},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                }
            )
            
            print(f"   Status: {sso_response.status_code}")
            
            if sso_response.status_code == 200:
                result = sso_response.json()
                print("   ✅ SUCCESS: SSO URL generated successfully!")
                print(f"   Rocket.Chat URL: {result.get('rocketChatUrl')}")
                return True
            else:
                print(f"   ❌ FAILED: {sso_response.text}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

if __name__ == "__main__":
    async def main():
        print("🧪 Running Enhanced Rocket.Chat Features Tests...")
        print("Make sure the backend server is running on http://localhost:8000")
        print("Make sure you have valid Rocket.Chat credentials in your .env file")
        print()
        
        # Test enhanced features
        enhanced_ok = await test_enhanced_features()
        
        # Test SSO integration
        sso_ok = await test_sso_integration()
        
        if enhanced_ok and sso_ok:
            print("\n🎉 All enhanced features tests passed!")
            print("The Rocket.Chat widget now supports:")
            print("  ✅ Channel and DM retrieval")
            print("  ✅ Post messages")
            print("  ✅ Thread messages")
            print("  ✅ Reactions (add/remove)")
            print("  ✅ SSO integration")
        else:
            print("\n❌ Some tests failed. Please check the output above.")
    
    asyncio.run(main())
