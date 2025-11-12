pipeline {
    agent none
    options {
        timeout(time: 10, unit: 'MINUTES')
    }
    stages {
        stage("Validate Build") {
            parallel {
                stage("Validate Javascript") {
                    agent { label 's61113u16 (litecore)' }
                    steps {
                        sh 'jenkins/js_build.sh 1.0.0'
                    }
                }
            }
        }
    }
}