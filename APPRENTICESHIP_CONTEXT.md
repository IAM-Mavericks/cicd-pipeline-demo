# Cloud/DevOps Apprenticeship — Progress Log

## Goal
Build a Cloud/DevOps portfolio to land a remote job.
Currently: Final year B.Sc. CS student at LASU, Lagos, Nigeria.

## Instructor Style
- Explain before fixing
- Teach concepts as we build
- Use both terminal and AWS console together
- Prefer cat > heredoc rewrites over nano for file editing

---

## Project 1 — AWS Production Infrastructure (COMPLETE)
Repo: https://github.com/IAM-Mavericks/aws-production-infra
Stack: Terraform, AWS
What was built:
- Custom VPC with public/private subnets
- EC2 Auto Scaling Group + Application Load Balancer
- RDS PostgreSQL (Multi-AZ)
- Remote state: S3 + DynamoDB locking
- IAM roles and security groups
Status: COMPLETE

---

## Project 2 — CI/CD Pipeline for SznPay (COMPLETE)
Repo: https://github.com/IAM-Mavericks/cicd-pipeline-demo
Stack: Node.js/Express, React/Vite, Docker, GitHub Actions, AWS ECR, EC2, MongoDB Atlas

What was built:
- Dockerised full-stack fintech application (SznPay)
- docker-compose for local development
- GitHub Actions CI/CD pipeline — 5 jobs:
  1. Test Backend (202 tests passing — Jest, Supertest)
  2. Lint Frontend (ESLint, pnpm)
  3. Build & Push Backend image to AWS ECR
  4. Build & Push Frontend image to AWS ECR
  5. Deploy to EC2 via SSH
- EC2 deployment server (t3.small, Amazon Linux 2023)
- MongoDB Atlas connected (SznPay-Cluster)
- Frontend live at: http://3.234.154.166
- Backend API at: http://3.234.154.166:3001/health

Key lessons learned:
- Jest circular require debugging
- CI vs local environment differences
- SSH authentication (PubkeyAuthentication, sshd_config)
- IAM roles over hardcoded credentials
- Shell variable expansion with special characters
- Docker image tagging with git SHA

AWS Resources:
- Account ID: 158988874502
- Region: us-east-1
- ECR repos: sznpay-backend, sznpay-frontend
- EC2 instance: i-0ab6e51aa0c9be6c9 (sznpay-server, IP: 3.234.154.166)
- Security group: sg-097462ee941e19b4b (ports 22, 80, 3001)
- IAM role: sznpay-ec2-role (ECR read access)
- Key pairs: ~/.ssh/sznpay-deploy.pem, ~/.ssh/github-deploy

Server env files:
- /home/ec2-user/sznpay.env (JWT secrets, NODE_ENV)
- /home/ec2-user/mongodb.env (MONGODB_URI — persistent, never overwritten by pipeline)

GitHub Secrets:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- PAYSTACK_SECRET_KEY
- EC2_HOST: 3.234.154.166
- EC2_USER: ec2-user
- EC2_SSH_KEY: (base64 encoded github-deploy key)
- JWT_SECRET
- JWT_REFRESH_SECRET
- MONGODB_URI: (base64 encoded — not used in pipeline, stored on server instead)

Status: COMPLETE ✅
LinkedIn article: Published

---

## Project 3 — Kubernetes on AWS EKS (NOT STARTED)
Goal: Deploy SznPay on Kubernetes using AWS EKS
Topics to cover:
- EKS cluster setup
- Kubernetes deployments, services, ingress
- Horizontal Pod Autoscaler
- Rolling deployments
- ConfigMaps and Secrets
- Update GitHub Actions pipeline to deploy to EKS

---

## Project 4 — Observability (NOT STARTED)
- Prometheus + Grafana
- CloudWatch integration
- Alerting

## Project 5 — Advanced IaC (NOT STARTED)
- Terraform modules and workspaces
- Reusable infrastructure

## Project 6 — Security (NOT STARTED)
- AWS WAF, GuardDuty
- Secrets Manager

## Project 7 — Serverless (NOT STARTED)
- Lambda, API Gateway, DynamoDB
