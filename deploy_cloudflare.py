#!/usr/bin/env python3
"""
Cloudflare Pages Deployment Script
Setup Cloudflare Pages project with GitHub integration
"""

import requests
import json
import sys

# Configuration
CF_TOKEN = "HVsLVLfDEPRcsRYbfFSojmxEHOwE-pSDnx74UpoKHVsLVLfDEPRcsRYbfFSojmxEHOwE-pSDnx74UpoK"
GITHUB_REPO = "sobatmbahmo/moimutapiliet"
GITHUB_BRANCH = "main"

headers = {
    "Authorization": f"Bearer {CF_TOKEN}",
    "Content-Type": "application/json"
}

def get_accounts():
    """Get Cloudflare account information"""
    print("🔍 Fetching Cloudflare accounts...")
    response = requests.get(
        "https://api.cloudflare.com/client/v4/accounts",
        headers=headers
    )
    
    if response.status_code != 200:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text}")
        return None
    
    data = response.json()
    if data.get("success"):
        print("✅ Connected to Cloudflare!")
        return data.get("result", [])
    else:
        print(f"❌ API Error: {data.get('errors')}")
        return None

def create_pages_project(account_id):
    """Create Cloudflare Pages project"""
    print(f"\n📝 Creating Pages project in account {account_id}...")
    
    payload = {
        "name": "moimutapiliet",
        "source": {
            "type": "github",
            "config": {
                "owner": "sobatmbahmo",
                "repo": "moimutapiliet",
                "production_branch": "main",
                "pr_comments_enabled": True,
                "deployments_enabled": True
            }
        },
        "build_config": {
            "build_command": "npm run build",
            "destination_dir": "dist",
            "root_dir": "",
            "web_analytics_token": ""
        },
        "env_vars": {
            "VITE_SUPABASE_URL": {
                "value": "https://sflnecqovkzfnrbsoawo.supabase.co"
            },
            "VITE_SUPABASE_KEY": {
                "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbG5lY3Fvdmt6Zm5yYnNvYXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4ODM0NjUsImV4cCI6MjA4NjQ1OTQ2NX0.ayQ_yjVAE-y2jbGI6pUN-KLDOt1ra31vErX9VEDmPgI"
            },
            "VITE_FONNTE_TOKEN": {
                "value": "rUanTDbsyiRTN9nqTp6v"
            }
        }
    }
    
    response = requests.post(
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects",
        headers=headers,
        json=payload
    )
    
    if response.status_code in [200, 201]:
        data = response.json()
        if data.get("success"):
            print("✅ Pages project created successfully!")
            return data.get("result", {})
        else:
            print(f"❌ API Error: {data.get('errors')}")
            return None
    else:
        print(f"❌ Error: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def main():
    print("=" * 60)
    print("🚀 CLOUDFLARE PAGES DEPLOYMENT SCRIPT")
    print("=" * 60)
    
    # Get accounts
    accounts = get_accounts()
    if not accounts:
        print("\n❌ Failed to connect to Cloudflare")
        sys.exit(1)
    
    if not accounts:
        print("❌ No accounts found")
        sys.exit(1)
    
    account_id = accounts[0]["id"]
    print(f"✅ Using account: {accounts[0]['name']} ({account_id})")
    
    # Create Pages project
    project = create_pages_project(account_id)
    if not project:
        print("\n❌ Failed to create Pages project")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ DEPLOYMENT COMPLETE!")
    print("=" * 60)
    print(f"\n📊 Project Details:")
    print(f"  Name: {project.get('name')}")
    print(f"  ID: {project.get('id')}")
    print(f"  URL: {project.get('subdomain', 'N/A')}.pages.dev")
    print(f"  Status: {project.get('deployment_configs', {}).get('production', {}).get('environment', 'N/A')}")
    
    print("\n🔄 First deployment will start automatically!")
    print("⏱️  Check deployment status at: https://dash.cloudflare.com/pages")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
