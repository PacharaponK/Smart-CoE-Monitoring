import json
import boto3
from datetime import datetime

def lambda_handler(event, context):
    s3 = boto3.client('s3')
    
    bucket_name = 'smart-coe-images'
    
    # ตั้งชื่อไฟล์ตามวันเวลา
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_name = f"images/{timestamp}.jpg"

    try:
        response = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket_name,
                'Key': file_name,
                'ContentType': 'image/jpeg'
            },
            ExpiresIn=300
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'upload_url': response,
                'file_name': file_name
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': str(e)
        }