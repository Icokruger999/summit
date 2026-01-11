$hostedZoneId = "Z04268983FAAJZLWOSRY7"
$changeBatch = @{
    Comment = "Create A record for summit-api.codingeverest.com"
    Changes = @(
        @{
            Action = "UPSERT"
            ResourceRecordSet = @{
                Name = "summit-api.codingeverest.com"
                Type = "A"
                TTL = 300
                ResourceRecords = @(
                    @{
                        Value = "52.48.245.252"
                    }
                )
            }
        }
    )
} | ConvertTo-Json -Depth 10

$changeBatch | Out-File -FilePath "dns-change-batch.json" -Encoding utf8 -NoNewline

Write-Host "Creating DNS record..."
$result = aws route53 change-resource-record-sets --hosted-zone-id $hostedZoneId --change-batch file://dns-change-batch.json --output json
$result

