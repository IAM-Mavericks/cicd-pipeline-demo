# Cloud/DevOps Apprenticeship — Progress Log

## Goal
Build a Cloud/DevOps portfolio to land a remote job.

## Project 1 — AWS Production Infrastructure (COMPLETE)
Repo: https://github.com/IAM-Mavericks/aws-production-infra
Stack: Terraform, AWS
What was built:
- Custom VPC with public/private subnets
- EC2 Auto Scaling Group + Application Load Balancer
- RDS PostgreSQL (Multi-AZ)
- Remote state: S3 + DynamoDB locking
- IAM roles and security groups
Status: Complete and deployed

## Project 2 — CI/CD Pipeline for SznPay (COMPLETE)
Repo: https://github.com/IAM-Mavericks/cicd-pipeline-demo
Stack: Node.js/Express, React/Vite, Docker, GitHub Actions, AWS ECR, AWS EC2, MongoDB Atlas
What was built:
- Dockerised full-stack application
- docker-compose for local development
- GitHub Actions CI/CD pipeline with 5 jobs:
  1. Test Backend (202 tests passing)
  2. Lint Frontend
  3. Build & Push Backend image to AWS ECR
  4. Build & Push Frontend image to AWS ECR
  5. Deploy to EC2 via SSH
- EC2 deployment server (t3.small, Amazon Linux 2023)
  - IP: 3.234.154.166
  - SSH key: ~/.ssh/github-deploy
  - Env file: /home/ec2-user/sznpay.env
- MongoDB Atlas connected (Maven-Cluster, us-east-1)
- Frontend live at: http://3.234.154.166
- Backend API at: http://3.234.154.166:3001/health

## Current Blockers / In Progress
- MONGODB_URI not passing correctly through GitHub Actions pipeline
  - Root cause: special characters in URI breaking shell variable expansion
  - Workaround: manually set in /home/ec2-user/sznpay.env on server
  - Fix attempted: base64 encoding the secret — needs verification
- EC2 disk space getting full — run: docker system prune -af

## AWS Resources
- Account ID: 158988874502
- Region: us-east-1
- ECR repos: sznpay-backend, sznpay-frontend
- EC2 instance: i-0ab6e51aa0c9be6c9 (sznpay-server)
- Security group: sg-097462ee941e19b4b
- IAM role: sznpay-ec2-role (ECR read access)
- Key pairs: sznpay-deploy.pem (instance access), github-deploy (CI/CD)

## GitHub Secrets configured
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- PAYSTACK_SECRET_KEY
- EC2_HOST: 3.234.154.166
- EC2_USER: ec2-user
- EC2_SSH_KEY: (base64 encoded github-deploy key)
- JWT_SECRET
- JWT_REFRESH_SECRET
- MONGODB_URI: (base64 encoded — currently not decoding correctly)

## Projects Remaining
- Project 3: Kubernetes (EKS) — container orchestration
- Project 4: Observability — Prometheus, Grafana, alerting
- Project 5: Advanced IaC — Terraform modules, workspaces
- Project 6: Security — AWS WAF, GuardDuty, secrets management
- Project 7: Serverless — Lambda, API Gateway, DynamoDB
