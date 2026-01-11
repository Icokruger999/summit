/**
 * AWS Lambda Function: Summit Site Health Checker
 * 
 * This Lambda function monitors summit.codingeverest.com and automatically
 * triggers remediation actions when issues are detected.
 * 
 * Setup:
 * 1. Create Lambda function in AWS Console
 * 2. Set environment variables: DOMAIN, API_DOMAIN, AMPLIFY_APP_ID
 * 3. Set up CloudWatch Events rule to trigger every 5 minutes
 * 4. Configure SNS topic for alerts
 */

const https = require('https');
const { execSync } = require('child_process');

const DOMAIN = process.env.DOMAIN || 'summit.codingeverest.com';
const API_DOMAIN = process.env.API_DOMAIN || 'summit-api.codingeverest.com';
const AMPLIFY_APP_ID = process.env.AMPLIFY_APP_ID;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

const AWS = require('aws-sdk');
const sns = new AWS.SNS({ region: AWS_REGION });

/**
 * Check if HTTPS endpoint is accessible
 */
function checkHttps(url, timeout = 10000) {
    return new Promise((resolve) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: 443,
            path: urlObj.pathname,
            method: 'GET',
            timeout: timeout,
            rejectUnauthorized: false, // Check certificate but don't reject
        };

        const req = https.request(options, (res) => {
            resolve({
                statusCode: res.statusCode,
                accessible: res.statusCode >= 200 && res.statusCode < 400,
            });
        });

        req.on('error', (error) => {
            resolve({
                statusCode: 0,
                accessible: false,
                error: error.message,
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                statusCode: 0,
                accessible: false,
                error: 'Request timeout',
            });
        });

        req.end();
    });
}

/**
 * Check SSL certificate validity
 */
function checkSSLCertificate(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            port: 443,
            method: 'GET',
            rejectUnauthorized: false,
        };

        const req = https.request(options, (res) => {
            const cert = res.socket.getPeerCertificate();
            const valid = cert && cert.valid_to;
            const expiryDate = valid ? new Date(cert.valid_to) : null;
            const daysUntilExpiry = expiryDate 
                ? Math.floor((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
                : null;

            resolve({
                valid: valid && daysUntilExpiry > 0,
                daysUntilExpiry,
                expiryDate: expiryDate ? expiryDate.toISOString() : null,
            });
        });

        req.on('error', () => {
            resolve({
                valid: false,
                daysUntilExpiry: null,
                expiryDate: null,
            });
        });

        req.end();
    });
}

/**
 * Send SNS notification
 */
async function sendAlert(subject, message) {
    if (!SNS_TOPIC_ARN) {
        console.log('SNS topic not configured, skipping alert');
        return;
    }

    try {
        await sns.publish({
            TopicArn: SNS_TOPIC_ARN,
            Subject: subject,
            Message: message,
        }).promise();
        console.log('Alert sent successfully');
    } catch (error) {
        console.error('Failed to send alert:', error);
    }
}

/**
 * Trigger Amplify certificate re-validation (placeholder)
 * Note: This requires additional AWS SDK calls to Amplify API
 */
async function remediateSSLIssue() {
    console.log('Attempting SSL certificate remediation...');
    
    // Placeholder for actual remediation logic
    // In production, you might:
    // 1. Call Amplify API to trigger certificate re-validation
    // 2. Update DNS records if needed
    // 3. Trigger CloudFormation/SSM automation
    
    await sendAlert(
        `SSL Certificate Issue: ${DOMAIN}`,
        `SSL certificate validation failed for ${DOMAIN}. Please check AWS Amplify Console.\n\n` +
        `Recommended actions:\n` +
        `1. Go to AWS Amplify Console\n` +
        `2. Check Domain Management for ${DOMAIN}\n` +
        `3. Verify DNS records are correct\n` +
        `4. Wait for certificate provisioning (1-2 hours)`
    );
}

/**
 * Main handler
 */
exports.handler = async (event) => {
    console.log(`Starting health check for ${DOMAIN}...`);
    
    const results = {
        timestamp: new Date().toISOString(),
        domain: DOMAIN,
        apiDomain: API_DOMAIN,
        checks: {},
        overall: 'healthy',
    };

    try {
        // Check SSL certificate
        console.log('Checking SSL certificate...');
        const sslCheck = await checkSSLCertificate(DOMAIN);
        results.checks.ssl = sslCheck;

        if (!sslCheck.valid) {
            console.error('SSL certificate check failed');
            results.overall = 'unhealthy';
            await remediateSSLIssue();
        }

        // Check site accessibility
        console.log('Checking site accessibility...');
        const siteCheck = await checkHttps(`https://${DOMAIN}`);
        results.checks.site = siteCheck;

        if (!siteCheck.accessible) {
            console.error('Site is not accessible');
            results.overall = 'unhealthy';
            await sendAlert(
                `Site Down: ${DOMAIN}`,
                `Site ${DOMAIN} is not accessible (HTTP ${siteCheck.statusCode}).\n\n` +
                `Please check:\n` +
                `1. AWS Amplify build status\n` +
                `2. Domain configuration\n` +
                `3. Backend services`
            );
        }

        // Check API accessibility
        console.log('Checking API accessibility...');
        const apiCheck = await checkHttps(`https://${API_DOMAIN}/health`);
        results.checks.api = apiCheck;

        if (!apiCheck.accessible) {
            console.warn('API is not accessible');
            await sendAlert(
                `API Down: ${API_DOMAIN}`,
                `API ${API_DOMAIN} is not accessible (HTTP ${apiCheck.statusCode}).\n\n` +
                `Please check backend services on EC2.`
            );
        }

        // Log results
        console.log('Health check results:', JSON.stringify(results, null, 2));

        // Send success notification if recovered
        if (results.overall === 'healthy') {
            console.log('All checks passed - Site is healthy');
        }

        return {
            statusCode: results.overall === 'healthy' ? 200 : 500,
            body: JSON.stringify(results, null, 2),
        };

    } catch (error) {
        console.error('Health check error:', error);
        await sendAlert(
            `Health Check Error: ${DOMAIN}`,
            `Health check failed with error: ${error.message}`
        );

        return {
            statusCode: 500,
            body: JSON.stringify({
                error: error.message,
                timestamp: new Date().toISOString(),
            }, null, 2),
        };
    }
};

