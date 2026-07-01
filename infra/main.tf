terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "ssh_key_fingerprint" {
  description = "SSH key fingerprint (from DigitalOcean)"
  type        = string
}

variable "openai_api_key" {
  description = "OpenAI API key (fallback if vLLM not ready)"
  type        = string
  sensitive   = true
  default     = ""
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "drugforge_gpu" {
  name   = "drugforge-mi300x"
  region = "tor1" # Toronto — check which regions have MI300X
  size   = "gpu-h100x1-80gb" # Placeholder — use actual MI300X slug from DO API
  image  = 221160341          # vLLM Quick Start (ROCm 7.2, vLLM 0.17.1)

  ssh_keys = [var.ssh_key_fingerprint]

  # Run setup on first boot
  user_data = <<-EOF
    #!/bin/bash
    cd /root
    git clone https://github.com/YoussefMadkour/CatalystMD.git
    cd CatalystMD
    bash scripts/setup-amd.sh 2>&1 | tee /tmp/drugforge-setup.log

    # Start backend
    cd /root/CatalystMD
    USE_AMD_GPU=true \
    QWEN_API_URL=http://localhost:8001/v1 \
    QWEN_MODEL=Qwen/Qwen2.5-7B-Instruct \
    nohup uvicorn backend.main:app --host 0.0.0.0 --port 8080 > /tmp/backend.log 2>&1 &
  EOF

  tags = ["drugforge", "hackathon"]
}

# Firewall: only expose what we need
resource "digitalocean_firewall" "drugforge" {
  name        = "drugforge-firewall"
  droplet_ids = [digitalocean_droplet.drugforge_gpu.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "8080"
    source_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0"]
  }
}

output "droplet_ip" {
  value       = digitalocean_droplet.drugforge_gpu.ipv4_address
  description = "GPU Droplet public IP — set as NEXT_PUBLIC_API_URL"
}

output "ssh_command" {
  value = "ssh root@${digitalocean_droplet.drugforge_gpu.ipv4_address}"
}

output "api_url" {
  value = "http://${digitalocean_droplet.drugforge_gpu.ipv4_address}:8080"
}

output "cost_warning" {
  value = "⚠️  $1.99/hr — run 'terraform destroy' when done!"
}
