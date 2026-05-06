pipeline {
    agent any

    environment {
        AWS_REGION      = 'us-east-1'
        AWS_ACCOUNT_ID  = '217019990405'
        ECR_BACKEND     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sznpay-backend"
        ECR_FRONTEND    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sznpay-frontend"
        ECS_CLUSTER     = 'sznpay-cluster'
        BACKEND_SVC     = 'sznpay-backend-service'
        FRONTEND_SVC    = 'sznpay-frontend-service'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }

        stage('Test Backend') {
            steps {
                echo 'Running backend tests...'
                dir('backend') {
                    sh '''
                        npm ci
                        npm test -- --passWithNoTests
                    '''
                }
            }
        }

        stage('Lint Frontend') {
            steps {
                echo 'Linting frontend...'
                dir('frontend') {
                    sh '''
                        npm install -g pnpm
                        pnpm install
                        pnpm lint || true
                    '''
                }
            }
        }

        stage('Build & Push Backend') {
            steps {
                echo 'Building and pushing backend image to ECR...'
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    sh '''
                        aws ecr get-login-password --region $AWS_REGION | \
                            docker login --username AWS --password-stdin \
                            $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

                        docker build -t $ECR_BACKEND:$IMAGE_TAG ./backend
                        docker tag $ECR_BACKEND:$IMAGE_TAG $ECR_BACKEND:latest
                        docker push $ECR_BACKEND:$IMAGE_TAG
                        docker push $ECR_BACKEND:latest
                    '''
                }
            }
        }

        stage('Build & Push Frontend') {
            steps {
                echo 'Building and pushing frontend image to ECR...'
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    sh '''
                        docker build -t $ECR_FRONTEND:$IMAGE_TAG ./frontend
                        docker tag $ECR_FRONTEND:$IMAGE_TAG $ECR_FRONTEND:latest
                        docker push $ECR_FRONTEND:$IMAGE_TAG
                        docker push $ECR_FRONTEND:latest
                    '''
                }
            }
        }

        stage('Deploy to ECS') {
            steps {
                echo 'Deploying to ECS Fargate...'
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-credentials'
                ]]) {
                    sh '''
                        aws ecs update-service \
                            --cluster $ECS_CLUSTER \
                            --service $BACKEND_SVC \
                            --force-new-deployment \
                            --region $AWS_REGION

                        aws ecs update-service \
                            --cluster $ECS_CLUSTER \
                            --service $FRONTEND_SVC \
                            --force-new-deployment \
                            --region $AWS_REGION

                        echo "Deployment triggered successfully"
                        echo "Backend: $ECR_BACKEND:$IMAGE_TAG"
                        echo "Frontend: $ECR_FRONTEND:$IMAGE_TAG"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! SznPay deployed to ECS.'
        }
        failure {
            echo 'Pipeline failed. Check logs above for details.'
        }
    }
}
